// ============================================================================
//  routes/pagos.routes.js
//  Integración con Mercado Pago — Checkout Pro
//
//  Endpoints:
//    POST /api/pagos/crear-preferencia  → Genera link de pago MP
//    POST /api/pagos/webhook            → MP notifica pagos aprobados
//    GET  /api/pagos/verificar/:ref     → Verifica un payment_id / preference_id / external_reference
// ============================================================================

import express          from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import db               from '../config/database.js';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';

const router = express.Router();

// ── Cliente MP inicializado de forma lazy (dotenv ya cargado cuando se llama) ──
let _mpClient = null;
function getMpClient() {
  if (!_mpClient) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error('MP_ACCESS_TOKEN no está definido en .env');
    _mpClient = new MercadoPagoConfig({ accessToken: token });
    console.log('[MP] Cliente Mercado Pago inicializado correctamente.');
  }
  return _mpClient;
}

// ── Responder 200 a validaciones GET del webhook de MP ───────────────────────
router.get('/webhook', (_req, res) => res.sendStatus(200));


// ── Helper: extraer metadatos del pago (MP puede convertir snake_case ↔ camelCase) ──
//  MP a veces entrega:  pago.metadata.id_suscriptor  (snake_case)
//  y otras veces:       pago.metadata.idSuscriptor   (camelCase)
//  También extraemos de external_reference como fallback definitivo.
function extraerMetadata(pago) {
  const meta = pago.metadata ?? {};

  let id_suscriptor = meta.id_suscriptor ?? meta.idSuscriptor ?? null;
  let id_tipo       = meta.id_tipo       ?? meta.idTipo       ?? null;

  // Fallback: parsear external_reference  →  "SUS-{id}-TIPO-{id}-{ts}"
  if (!id_suscriptor || !id_tipo) {
    const ref   = pago.external_reference ?? '';
    const match = ref.match(/^SUS-(\d+)-TIPO-(\d+)-/);
    if (match) {
      id_suscriptor = Number(match[1]);
      id_tipo       = Number(match[2]);
      console.log(`[MP] Metadata recuperada de external_reference: suscriptor=${id_suscriptor} tipo=${id_tipo}`);
    }
  }

  return {
    id_suscriptor: id_suscriptor ? Number(id_suscriptor) : null,
    id_tipo:       id_tipo       ? Number(id_tipo)       : null,
  };
}

// ── Helper: obtener id_sucursal del token según el rol ───────────────────────
function getIdSucursal(usuario) {
  if (usuario.rol === 'sucursal' || usuario.rol === 'maestro') return usuario.id;
  if (usuario.rol === 'personal') return usuario.id_sucursal;
  return null;
}

// ============================================================================
//  POST /api/pagos/crear-preferencia
//  Crea una preferencia de pago en MP y devuelve el link de pago.
//
//  Body: { id_suscriptor, id_tipo }
//  Response: { preference_id, init_point }
// ============================================================================
router.post('/crear-preferencia', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { id_suscriptor, id_tipo } = req.body;

    if (!id_suscriptor || !id_tipo) {
      return res.status(400).json({ message: 'id_suscriptor e id_tipo son requeridos.' });
    }

    // ── Obtener id_sucursal del token ────────────────────────────────────────
    let id_sucursal = getIdSucursal(req.usuario);

    // Si es personal, obtener id_sucursal real desde la BD
    if (req.usuario.rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
        [req.usuario.id]
      );
      if (!emp) return res.status(403).json({ message: 'No se pudo verificar la sucursal del empleado.' });
      id_sucursal = emp.id_sucursal;
    }

    // ── Validar: el plan debe pertenecer a la sucursal del operador ──────────
    const [[plan]] = await db.query(
      `SELECT id_tipo, nombre, precio, duracion_dias
       FROM tipos_suscripcion
       WHERE id_tipo = ? AND id_sucursal = ? AND activo = 1`,
      [id_tipo, id_sucursal]
    );
    if (!plan) {
      return res.status(404).json({ message: 'Plan de suscripción no encontrado o no pertenece a esta sucursal.' });
    }

    // ── Obtener datos del suscriptor ─────────────────────────────────────────
    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, apellido_paterno, correo
       FROM suscriptores
       WHERE id_suscriptor = ? AND activo = 1`,
      [id_suscriptor]
    );
    if (!suscriptor) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    // ── Referencia externa única (sirve como fallback del webhook) ───────────
    const external_reference = `SUS-${id_suscriptor}-TIPO-${id_tipo}-${Date.now()}`;

    // ── Crear preferencia en Mercado Pago ────────────────────────────────────
    const preference = new Preference(getMpClient());
    const resultado  = await preference.create({
      body: {
        items: [
          {
            id:          String(plan.id_tipo),
            title:       `AXF Gym – ${plan.nombre}`,
            description: `Suscripción por ${plan.duracion_dias} días`,
            quantity:    1,
            unit_price:  Number(plan.precio),
            currency_id: 'MXN',
          },
        ],
        payer: {
          name:  suscriptor.nombres,
          email: suscriptor.correo,
        },
        // Metadatos — el SDK v2 de MP convierte estas claves a camelCase
        // al devolverlas vía API (id_suscriptor → idSuscriptor).
        // El webhook usa extraerMetadata() que maneja ambas variantes.
        metadata: {
          id_suscriptor: Number(id_suscriptor),
          id_tipo:       Number(id_tipo),
          id_sucursal:   Number(id_sucursal),
        },
        // SDK v2 de MP requiere camelCase en estos campos:
        backUrls: {
          success: `${process.env.FRONTEND_URL}/suscripciones?pago=exitoso&suscriptor=${id_suscriptor}&plan=${id_tipo}&extref=${external_reference}`,
          failure: `${process.env.FRONTEND_URL}/suscripciones?pago=fallido`,
          pending: `${process.env.FRONTEND_URL}/suscripciones?pago=pendiente`,
        },
        autoReturn:      'approved',
        notificationUrl: `${process.env.BACKEND_URL}/api/pagos/webhook`,
        externalReference: external_reference,
      },
    });

    console.log(`[MP] ✅ Preferencia creada: ${resultado.id} | ext_ref: ${external_reference} | suscriptor: ${id_suscriptor}`);

    res.json({
      preference_id:      resultado.id,
      init_point:         resultado.init_point,   // URL de pago real
      sandbox_init_point: resultado.sandbox_init_point, // URL de pago de prueba
      external_reference,
    });

  } catch (error) {
    console.error('[POST /pagos/crear-preferencia]', error);
    res.status(500).json({ message: 'Error al crear la preferencia de pago.' });
  }
});

// ============================================================================
//  POST /api/pagos/webhook
//  Mercado Pago notifica aquí cuando ocurre un evento de pago.
//  IMPORTANTE: Este endpoint NO debe llevar JWT — MP llama desde sus servidores.
// ============================================================================
router.post('/webhook', async (req, res) => {
  // Responder 200 de inmediato para que MP no reintente
  res.sendStatus(200);

  const { type, data, action } = req.body;
  console.log(`[WEBHOOK MP] tipo=${type} action=${action} data=${JSON.stringify(data)}`);

  // MP puede notificar como "payment" o "merchant_order"
  // Solo procesamos eventos de pago
  if (type !== 'payment') {
    if (type === 'merchant_order') {
      console.log('[WEBHOOK MP] Evento merchant_order recibido (ignorado, se espera el evento payment).');
    }
    return;
  }

  const paymentId = data?.id;
  if (!paymentId) {
    console.warn('[WEBHOOK MP] Webhook sin payment id.');
    return;
  }

  try {
    const paymentApi = new Payment(getMpClient());
    const pago       = await paymentApi.get({ id: paymentId });

    console.log(`[WEBHOOK MP] Payment ${pago.id} status=${pago.status} ext_ref=${pago.external_reference}`);

    if (pago.status !== 'approved') {
      console.log(`[WEBHOOK MP] Pago ${pago.id} no está aprobado (status=${pago.status}), se ignora.`);
      return;
    }

    // ── Extraer metadatos con fallback a external_reference ─────────────────
    const { id_suscriptor, id_tipo } = extraerMetadata(pago);

    if (!id_suscriptor || !id_tipo) {
      console.error('[WEBHOOK MP] ❌ No se pudo recuperar id_suscriptor/id_tipo del pago:', pago.id);
      console.error('[WEBHOOK MP] metadata recibida:', JSON.stringify(pago.metadata));
      console.error('[WEBHOOK MP] external_reference recibida:', pago.external_reference);
      return;
    }

    // ── Verificar idempotencia (pago ya procesado) ───────────────────────────
    const [[existe]] = await db.query(
      `SELECT id_suscripcion FROM suscripciones WHERE mp_payment_id = ?`,
      [String(pago.id)]
    );
    if (existe) {
      console.log(`[WEBHOOK MP] Pago ${pago.id} ya fue procesado. Se omite.`);
      return;
    }

    // ── Obtener datos del plan ───────────────────────────────────────────────
    const [[tipo]] = await db.query(
      `SELECT duracion_dias, limite_sesiones_nutriologo, limite_sesiones_entrenador, nombre
       FROM tipos_suscripcion WHERE id_tipo = ? AND activo = 1`,
      [id_tipo]
    );
    if (!tipo) {
      console.error('[WEBHOOK MP] ❌ Tipo de suscripción no encontrado:', id_tipo);
      return;
    }

    // ── Calcular fechas (acumular si hay suscripción activa) ─────────────────
    const [[activa]] = await db.query(
      `SELECT fecha_fin FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
       ORDER BY fecha_fin DESC LIMIT 1`,
      [id_suscriptor]
    );

    let inicio;
    if (activa) {
      const finActual = new Date(activa.fecha_fin);
      finActual.setDate(finActual.getDate() + 1);
      inicio = finActual;
    } else {
      inicio = new Date();
    }

    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + tipo.duracion_dias - 1);

    await crearSuscripcionDesdeMP(pago);

  } catch (err) {
    console.error('[WEBHOOK MP] ❌ Error procesando notificación:', err.message ?? err);
  }
});

// ============================================================================
//  Helper compartido: crea la suscripción a partir de un objeto de pago MP.
//  Usado tanto por el webhook como por el endpoint /verificar (fallback local).
//  Retorna el registro de suscripción creado, o el existente si ya fue procesado.
// ============================================================================
async function crearSuscripcionDesdeMP(pago) {
  const fmt = (d) => d.toISOString().split('T')[0];

  const { id_suscriptor, id_tipo } = extraerMetadata(pago);
  if (!id_suscriptor || !id_tipo) {
    console.error('[MP] ❌ crearSuscripcionDesdeMP: sin id_suscriptor/id_tipo', pago.id);
    return null;
  }

  // ── Idempotencia ────────────────────────────────────────────────────────────
  const [[existe]] = await db.query(
    `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado,
            t.nombre as plan_nombre
     FROM suscripciones s
     JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
     WHERE s.mp_payment_id = ?`,
    [String(pago.id)]
  );
  if (existe) {
    console.log(`[MP] Pago ${pago.id} ya procesado (idempotencia).`);
    return existe;
  }

  // ── Obtener plan ────────────────────────────────────────────────────────────
  const [[tipo]] = await db.query(
    `SELECT duracion_dias, limite_sesiones_nutriologo, limite_sesiones_entrenador, nombre
     FROM tipos_suscripcion WHERE id_tipo = ? AND activo = 1`,
    [id_tipo]
  );
  if (!tipo) {
    console.error('[MP] ❌ Tipo de suscripción no encontrado:', id_tipo);
    return null;
  }

  // ── Calcular fechas (acumular si hay suscripción activa vigente) ────────────
  const [[activa]] = await db.query(
    `SELECT fecha_fin FROM suscripciones
     WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
     ORDER BY fecha_fin DESC LIMIT 1`,
    [id_suscriptor]
  );

  let inicio;
  if (activa) {
    const finActual = new Date(activa.fecha_fin);
    finActual.setDate(finActual.getDate() + 1);
    inicio = finActual;
  } else {
    inicio = new Date();
  }

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + tipo.duracion_dias - 1);

  // ── Insertar ─────────────────────────────────────────────────────────────────
  const [result] = await db.query(
    `INSERT INTO suscripciones
       (id_suscriptor, id_tipo, fecha_inicio, fecha_fin,
        sesiones_nutriologo_restantes, sesiones_entrenador_restantes,
        estado, mp_payment_id)
     VALUES (?, ?, ?, ?, ?, ?, 'Activa', ?)`,
    [
      id_suscriptor,
      id_tipo,
      fmt(inicio),
      fmt(fin),
      tipo.limite_sesiones_nutriologo,
      tipo.limite_sesiones_entrenador,
      String(pago.id),
    ]
  );

  console.log(`[MP] ✅ Suscripción creada | id=${result.insertId} | suscriptor=${id_suscriptor} | plan="${tipo.nombre}" | ${fmt(inicio)} → ${fmt(fin)} | pago=${pago.id}`);
  return {
    id_suscripcion: result.insertId,
    fecha_inicio:   fmt(inicio),
    fecha_fin:      fmt(fin),
    estado:         'Activa',
    plan_nombre:    tipo.nombre,
  };
}

// ============================================================================
//  GET /api/pagos/verificar/:ref
//
//  El frontend llama esto después del redirect de MP para confirmar el pago.
//  Si MP confirma que el pago está aprobado y aún no está en BD, lo procesa
//  AQUÍ MISMO (no espera el webhook — necesario en desarrollo local).
//
//  :ref puede ser:
//    - payment_id numérico → viene en ?payment_id= del redirect de MP
//    - external_reference  → viene en ?extref= que pusimos en back_urls
// ============================================================================
router.get('/verificar/:ref', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { ref } = req.params;
    const fmt = (d) => d.toISOString().split('T')[0];

    // ── 1. Buscar en BD por payment_id (webhook ya lo procesó) ───────────────
    const [[porPaymentId]] = await db.query(
      `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado,
              t.nombre as plan_nombre
       FROM suscripciones s
       JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
       WHERE s.mp_payment_id = ?`,
      [ref]
    );
    if (porPaymentId) {
      console.log(`[VERIFICAR] ✅ Pago ${ref} ya estaba procesado en BD.`);
      return res.json({ procesado: true, suscripcion: porPaymentId });
    }

    // ── 2. Si es external_reference, buscar por suscriptor+tipo en BD ────────
    if (ref.startsWith('SUS-')) {
      const match = ref.match(/^SUS-(\d+)-TIPO-(\d+)-/);
      if (match) {
        const id_sus = Number(match[1]);
        const id_tip = Number(match[2]);
        const [[reciente]] = await db.query(
          `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado,
                  t.nombre as plan_nombre
           FROM suscripciones s
           JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
           WHERE s.id_suscriptor = ? AND s.id_tipo = ?
             AND s.mp_payment_id IS NOT NULL
             AND s.mp_payment_id != 'CAJA'
           ORDER BY s.id_suscripcion DESC LIMIT 1`,
          [id_sus, id_tip]
        );
        if (reciente) {
          console.log(`[VERIFICAR] ✅ Suscripción encontrada via ext_ref para suscriptor=${id_sus}`);
          return res.json({ procesado: true, suscripcion: reciente });
        }
      }
    }

    // ── 3. Consultar MP directamente y PROCESAR si está aprobado ─────────────
    //    Esto es el fallback crítico para desarrollo local donde el webhook
    //    de MP no puede llegar a localhost.
    if (/^\d+$/.test(ref)) {
      try {
        const paymentApi = new Payment(getMpClient());
        const pago       = await paymentApi.get({ id: ref });

        console.log(`[VERIFICAR] MP status=${pago.status} para payment_id=${ref}`);

        if (pago.status === 'approved') {
          // Crear la suscripción directamente desde aquí
          const nuevaSub = await crearSuscripcionDesdeMP(pago);
          if (nuevaSub) {
            return res.json({ procesado: true, suscripcion: nuevaSub });
          }
          // Si crearSuscripcionDesdeMP devuelve null, hay datos insuficientes
          return res.json({ procesado: false, aprobado: true, status: pago.status,
            error: 'No se pudo extraer metadatos del pago. Contacta al administrador.' });
        }

        return res.json({
          procesado: false,
          status:    pago.status,
          aprobado:  pago.status === 'approved',
        });
      } catch (mpErr) {
        console.warn('[GET /pagos/verificar] No se pudo consultar MP:', mpErr.message);
      }
    }

    // ── 4. Respuesta por defecto: aún no procesado ───────────────────────────
    res.json({ procesado: false, status: 'pending', aprobado: false });

  } catch (error) {
    console.error('[GET /pagos/verificar]', error);
    res.status(500).json({ message: 'Error al verificar el pago.' });
  }
});

// ============================================================================
//  GET /api/pagos/esperar-extref/:extref
//
//  El frontend lo llama en polling (cada 3s) mientras el usuario está pagando
//  en Mercado Pago (en otra pestaña). Busca en MP por external_reference.
//  Cuando encuentra un pago aprobado, crea la suscripción automáticamente.
//
//  Retorna:
//    { encontrado: false }                     → todavía no hay pago
//    { encontrado: true, procesado: true, suscripcion }  → suscripción creada
// ============================================================================
router.get('/esperar-extref/:extref', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { extref } = req.params;

    // ── 1. Verificar si ya está en BD (puede haberse procesado antes) ─────────
    const match = extref.match(/^SUS-(\d+)-TIPO-(\d+)-/);
    if (match) {
      const id_sus = Number(match[1]);
      const id_tip = Number(match[2]);
      const [[existeBD]] = await db.query(
        `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado,
                t.nombre as plan_nombre
         FROM suscripciones s
         JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
         WHERE s.id_suscriptor = ? AND s.id_tipo = ?
           AND s.mp_payment_id IS NOT NULL
           AND s.mp_payment_id != 'CAJA'
         ORDER BY s.id_suscripcion DESC LIMIT 1`,
        [id_sus, id_tip]
      );
      if (existeBD) {
        return res.json({ encontrado: true, procesado: true, suscripcion: existeBD });
      }
    }

    // ── 2. Buscar en MP por external_reference usando la Search API ───────────
    // El SDK v2 de MP expone un cliente HTTP directo que podemos usar para
    // buscar pagos por external_reference.
    const mpClient = getMpClient();
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(extref)}&limit=5`,
      { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
    );

    if (!response.ok) {
      console.warn('[esperar-extref] MP search error:', response.status);
      return res.json({ encontrado: false });
    }

    const data   = await response.json();
    const pagos  = data.results ?? [];
    const aprobado = pagos.find(p => p.status === 'approved');

    if (!aprobado) {
      return res.json({ encontrado: false, total: pagos.length });
    }

    // ── 3. Pago aprobado → crear suscripción ─────────────────────────────────
    console.log(`[esperar-extref] ✅ Pago aprobado encontrado: ${aprobado.id} | ext_ref: ${extref}`);
    const nuevaSub = await crearSuscripcionDesdeMP(aprobado);

    if (nuevaSub) {
      return res.json({ encontrado: true, procesado: true, suscripcion: nuevaSub });
    }

    return res.json({ encontrado: true, procesado: false,
      error: 'No se pudieron extraer los metadatos del pago.' });

  } catch (error) {
    console.error('[GET /pagos/esperar-extref]', error);
    res.status(500).json({ message: 'Error al buscar el pago.' });
  }
});

export default router;

