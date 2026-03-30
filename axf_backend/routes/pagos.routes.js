// ============================================================================
//  routes/pagos.routes.js
//  Integración con Mercado Pago — Checkout Pro (MODO DESARROLLO / SANDBOX)
//
//  Flujo:
//    1. POST /api/pagos/crear-preferencia  → crea preferencia en MP
//    2. Frontend redirige al usuario a url_pago (sandbox_init_point)
//    3. Usuario paga en MP sandbox
//    4. MP redirige a FRONTEND_URL/suscripciones?pago=exitoso&payment_id=XXX&extref=YYY
//    5. Frontend llama GET /api/pagos/confirmar/:payment_id  (o /:extref)
//    6. Backend consulta MP → si aprobado → inserta suscripción en BD
// ============================================================================

import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import db from '../config/database.js';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';

const router = express.Router();

// ── Inicializar cliente MP ───────────────────────────────────────────────────
function getMpClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('[MP] MP_ACCESS_TOKEN no está definido en .env');
  return new MercadoPagoConfig({ accessToken: token });
}

// ── Extraer id_suscriptor e id_tipo del pago ─────────────────────────────────
// MP puede convertir snake_case a camelCase en metadata, cubrimos ambos.
// external_reference tiene formato: SUS-{id_suscriptor}-TIPO-{id_tipo}-{ts}
function extraerIds(pago) {
  const meta = pago.metadata ?? {};
  let id_suscriptor = meta.id_suscriptor ?? meta.idSuscriptor ?? null;
  let id_tipo       = meta.id_tipo       ?? meta.idTipo       ?? null;

  if (!id_suscriptor || !id_tipo) {
    const m = (pago.external_reference ?? '').match(/^SUS-(\d+)-TIPO-(\d+)-/);
    if (m) {
      id_suscriptor = Number(m[1]);
      id_tipo       = Number(m[2]);
      console.log(`[MP] IDs desde external_reference → suscriptor=${id_suscriptor}, tipo=${id_tipo}`);
    }
  }

  return {
    id_suscriptor: id_suscriptor ? Number(id_suscriptor) : null,
    id_tipo:       id_tipo       ? Number(id_tipo)       : null,
  };
}

// ── Registrar suscripción en BD (idempotente) ────────────────────────────────
async function registrarSuscripcion(pago) {
  const fmt          = (d) => d.toISOString().split('T')[0];
  const paymentIdStr = String(pago.id);

  console.log(`[MP] registrarSuscripcion → payment_id=${paymentIdStr}, status=${pago.status}`);

  // Idempotencia
  const [[existe]] = await db.query(
    `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado, t.nombre AS plan_nombre
     FROM suscripciones s JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
     WHERE s.mp_payment_id = ?`,
    [paymentIdStr]
  );
  if (existe) {
    console.log(`[MP] Pago ${paymentIdStr} ya registrado (id_suscripcion=${existe.id_suscripcion})`);
    return existe;
  }

  const { id_suscriptor, id_tipo } = extraerIds(pago);
  if (!id_suscriptor || !id_tipo) {
    console.error(`[MP] ❌ Sin id_suscriptor/id_tipo para pago ${paymentIdStr}`);
    console.error(`[MP]    metadata: ${JSON.stringify(pago.metadata)}`);
    console.error(`[MP]    external_reference: ${pago.external_reference}`);
    return null;
  }

  const [[tipo]] = await db.query(
    `SELECT duracion_dias, limite_sesiones_nutriologo, limite_sesiones_entrenador, nombre
     FROM tipos_suscripcion WHERE id_tipo = ? AND activo = 1`,
    [id_tipo]
  );
  if (!tipo) {
    console.error(`[MP] ❌ Tipo suscripción id_tipo=${id_tipo} no encontrado`);
    return null;
  }

  // Acumular si hay suscripción activa vigente
  const [[activa]] = await db.query(
    `SELECT fecha_fin FROM suscripciones
     WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
     ORDER BY fecha_fin DESC LIMIT 1`,
    [id_suscriptor]
  );

  let inicio;
  if (activa) {
    inicio = new Date(activa.fecha_fin);
    inicio.setDate(inicio.getDate() + 1);
    console.log(`[MP] Acumulando. Inicio después de suscripción activa.`);
  } else {
    inicio = new Date();
  }

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + tipo.duracion_dias - 1);

  const [result] = await db.query(
    `INSERT INTO suscripciones
       (id_suscriptor, id_tipo, fecha_inicio, fecha_fin,
        sesiones_nutriologo_restantes, sesiones_entrenador_restantes,
        estado, mp_payment_id)
     VALUES (?, ?, ?, ?, ?, ?, 'Activa', ?)`,
    [
      id_suscriptor, id_tipo,
      fmt(inicio), fmt(fin),
      tipo.limite_sesiones_nutriologo,
      tipo.limite_sesiones_entrenador,
      paymentIdStr,
    ]
  );

  console.log(`[MP] ✅ Suscripción creada → id=${result.insertId}, suscriptor=${id_suscriptor}, plan="${tipo.nombre}", ${fmt(inicio)} → ${fmt(fin)}`);

  return {
    id_suscripcion: result.insertId,
    fecha_inicio:   fmt(inicio),
    fecha_fin:      fmt(fin),
    estado:         'Activa',
    plan_nombre:    tipo.nombre,
  };
}

// ============================================================================
//  POST /api/pagos/crear-preferencia
// ============================================================================
router.post('/crear-preferencia', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { id_suscriptor, id_tipo } = req.body;
    console.log(`[MP] crear-preferencia → suscriptor=${id_suscriptor}, tipo=${id_tipo}, rol=${req.usuario.rol}`);

    if (!id_suscriptor || !id_tipo) {
      return res.status(400).json({ message: 'id_suscriptor e id_tipo son requeridos.' });
    }

    // Determinar id_sucursal
    let id_sucursal;
    const { rol, id: uid } = req.usuario;

    if (rol === 'sucursal' || rol === 'maestro') {
      id_sucursal = uid;
    } else if (rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`, [uid]
      );
      if (!emp) return res.status(403).json({ message: 'No se pudo verificar la sucursal del empleado.' });
      id_sucursal = emp.id_sucursal;
    }

    console.log(`[MP] id_sucursal=${id_sucursal}`);

    const [[plan]] = await db.query(
      `SELECT id_tipo, nombre, precio, duracion_dias
       FROM tipos_suscripcion WHERE id_tipo = ? AND id_sucursal = ? AND activo = 1`,
      [id_tipo, id_sucursal]
    );
    if (!plan) {
      console.error(`[MP] ❌ Plan id_tipo=${id_tipo} no existe en sucursal=${id_sucursal}`);
      return res.status(404).json({ message: 'Plan no encontrado para esta sucursal.' });
    }

    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, apellido_paterno, correo
       FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
      [id_suscriptor]
    );
    if (!suscriptor) {
      console.error(`[MP] ❌ Suscriptor id=${id_suscriptor} no encontrado`);
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    const external_reference = `SUS-${id_suscriptor}-TIPO-${id_tipo}-${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:3001';

    const preferenceApi = new Preference(getMpClient());
    const resultado = await preferenceApi.create({
      body: {
        items: [{
          id:          String(plan.id_tipo),
          title:       `AXF Gym – ${plan.nombre}`,
          description: `Suscripción por ${plan.duracion_dias} días`,
          quantity:    1,
          unit_price:  Number(plan.precio),
          currency_id: 'MXN',
        }],
        payer: {
          name:  suscriptor.nombres,
          email: suscriptor.correo,
        },
        metadata: {
          id_suscriptor: Number(id_suscriptor),
          id_tipo:       Number(id_tipo),
          id_sucursal:   Number(id_sucursal),
        },
        backUrls: {
          success: `${frontendUrl}/suscripciones?pago=exitoso&extref=${external_reference}`,
          failure: `${frontendUrl}/suscripciones?pago=fallido`,
          pending: `${frontendUrl}/suscripciones?pago=pendiente`,
        },
        autoReturn:        'approved',
        notificationUrl:   `${backendUrl}/api/pagos/webhook`,
        externalReference: external_reference,
      },
    });

    // sandbox_init_point → aparece solo con credenciales de PRUEBA
    // init_point         → aparece con credenciales de PRODUCCIÓN
    const url_pago = resultado.sandbox_init_point || resultado.init_point;

    console.log(`[MP] ✅ Preferencia creada → preference_id=${resultado.id}`);
    console.log(`[MP]    url_pago (sandbox): ${resultado.sandbox_init_point}`);
    console.log(`[MP]    url_pago (prod):    ${resultado.init_point}`);
    console.log(`[MP]    external_reference: ${external_reference}`);

    res.json({ preference_id: resultado.id, url_pago, external_reference });

  } catch (error) {
    console.error('[MP] ❌ Error en crear-preferencia:');
    console.error('  message:', error?.message);
    if (error?.cause)    console.error('  cause:',    error.cause);
    if (error?.response) console.error('  MP response:', JSON.stringify(error.response, null, 2));
    console.error(error);
    res.status(500).json({ message: 'Error al crear preferencia de pago.', detalle: error?.message });
  }
});

// ============================================================================
//  GET /api/pagos/confirmar/:ref
//
//  El frontend llama este endpoint después del redirect de MP.
//  :ref puede ser un payment_id numérico O una external_reference SUS-...
//
//  Consulta MP, verifica que esté aprobado, y registra la suscripción.
//  (Funciona en localhost porque es el FRONTEND quien llama al BACKEND,
//   no MP directamente como el webhook.)
// ============================================================================
router.get('/confirmar/:ref', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { ref } = req.params;
    console.log(`[MP] confirmar → ref=${ref}`);

    // --- Caso A: payment_id numérico ---
    if (/^\d+$/.test(ref)) {
      const paymentApi = new Payment(getMpClient());
      let pago;
      try {
        pago = await paymentApi.get({ id: ref });
      } catch (mpErr) {
        console.error(`[MP] ❌ Error consultando payment_id=${ref}:`, mpErr?.message);
        return res.status(502).json({ ok: false, message: 'No se pudo consultar el pago en Mercado Pago.' });
      }

      console.log(`[MP] payment_id=${ref} → status=${pago.status}, ext_ref=${pago.external_reference}`);

      if (pago.status !== 'approved') {
        return res.json({ ok: false, status: pago.status, message: `Estado del pago: ${pago.status}` });
      }

      const suscripcion = await registrarSuscripcion(pago);
      if (!suscripcion) {
        return res.status(500).json({ ok: false, message: 'Pago aprobado pero falló la creación de suscripción. Ver logs.' });
      }
      return res.json({ ok: true, suscripcion });
    }

    // --- Caso B: external_reference (SUS-...) → Search API ---
    if (ref.startsWith('SUS-')) {
      console.log(`[MP] Buscando por external_reference en Search API...`);

      const searchResp = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(ref)}&limit=5`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );

      if (!searchResp.ok) {
        const body = await searchResp.text();
        console.error(`[MP] ❌ Search API → ${searchResp.status}: ${body}`);
        return res.status(502).json({ ok: false, message: 'Error en Search API de Mercado Pago.' });
      }

      const data     = await searchResp.json();
      const pagos    = data.results ?? [];
      const aprobado = pagos.find(p => p.status === 'approved');

      console.log(`[MP] Search API → ${pagos.length} resultados, aprobado: ${aprobado?.id ?? 'ninguno'}`);

      if (!aprobado) {
        return res.json({ ok: false, status: 'pending', message: 'No hay pago aprobado para esta referencia todavía.' });
      }

      const suscripcion = await registrarSuscripcion(aprobado);
      if (!suscripcion) {
        return res.status(500).json({ ok: false, message: 'Pago aprobado pero falló la creación de suscripción. Ver logs.' });
      }
      return res.json({ ok: true, suscripcion });
    }

    return res.status(400).json({ ok: false, message: 'Referencia inválida.' });

  } catch (error) {
    console.error('[MP] ❌ Error en confirmar:');
    console.error('  message:', error?.message);
    console.error(error);
    res.status(500).json({ ok: false, message: 'Error al confirmar el pago.' });
  }
});

// ============================================================================
//  POST /api/pagos/webhook
//  MP llama aquí en producción. En localhost NO llega (MP no puede contactar 127.0.0.1).
// ============================================================================
router.get('/webhook',  (_req, res) => res.sendStatus(200));
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Siempre responder 200 inmediato

  const { type, data } = req.body;
  console.log(`[MP WEBHOOK] type=${type}, data=${JSON.stringify(data)}`);

  if (type !== 'payment') return;

  const paymentId = data?.id;
  if (!paymentId) { console.warn('[MP WEBHOOK] Sin payment_id'); return; }

  try {
    const paymentApi = new Payment(getMpClient());
    const pago = await paymentApi.get({ id: paymentId });
    console.log(`[MP WEBHOOK] payment ${pago.id} → status=${pago.status}`);
    if (pago.status !== 'approved') return;
    await registrarSuscripcion(pago);
  } catch (err) {
    console.error('[MP WEBHOOK] ❌ Error:', err?.message);
    console.error(err);
  }
});

export default router;
