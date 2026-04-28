// ============================================================================
//  routes/pagos.routes.js
//  Integración con PayPal — Orders API v2
//
//  Flujo:
//    1. POST /api/pagos/crear-orden     → crea orden en PayPal
//    2. Frontend redirige al usuario a approve_url
//    3. Usuario aprueba en PayPal
//    4. PayPal redirige a FRONTEND_URL/suscripciones?pago=exitoso&token=ORDER_ID&sus=X&tipo=Y
//    5. Frontend llama GET /api/pagos/confirmar/:token?sus=X&tipo=Y
//    6. Backend captura la orden en PayPal → si COMPLETED → inserta suscripción en BD
// ============================================================================

import express from 'express';
import db from '../config/database.js';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';

const router = express.Router();

// Sandbox: https://api-m.sandbox.paypal.com  |  Producción: https://api-m.paypal.com
const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

// ── Obtener access token de PayPal ───────────────────────────────────────────
async function getPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error('[PayPal] PAYPAL_CLIENT_ID o PAYPAL_SECRET no definidos en .env');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`[PayPal] Error obteniendo token: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ── Registrar suscripción en BD (idempotente) ─────────────────────────────────
async function registrarSuscripcion(orderId, id_suscriptor, id_tipo, id_promocion) {
  const fmt = (d) => d.toISOString().split('T')[0];
  console.log(`[PayPal] registrarSuscripcion → order_id=${orderId}, suscriptor=${id_suscriptor}, tipo=${id_tipo}, promo=${id_promocion}`);

  // Idempotencia
  const [[existe]] = await db.query(
    `SELECT s.id_suscripcion, s.fecha_inicio, s.fecha_fin, s.estado,
            COALESCE(t.nombre, p.nombre) AS plan_nombre
     FROM suscripciones s
     LEFT JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
     LEFT JOIN promociones p ON p.id_promocion = s.id_promocion
     WHERE s.paypal_order_id = ?`,
    [orderId]
  );
  if (existe) {
    console.log(`[PayPal] Orden ${orderId} ya registrada (id_suscripcion=${existe.id_suscripcion})`);
    return existe;
  }

  let planData;
  if (id_promocion) {
    const [[promo]] = await db.query(
      `SELECT duracion_dias, sesiones_nutriologo AS limite_sesiones_nutriologo, sesiones_entrenador AS limite_sesiones_entrenador, nombre
       FROM promociones WHERE id_promocion = ? AND activo = 1`,
      [id_promocion]
    );
    planData = promo;
  } else {
    const [[tipo]] = await db.query(
      `SELECT duracion_dias, limite_sesiones_nutriologo, limite_sesiones_entrenador, nombre
       FROM tipos_suscripcion WHERE id_tipo = ? AND activo = 1`,
      [id_tipo]
    );
    planData = tipo;
  }

  if (!planData) {
    console.error(`[PayPal] Plan no encontrado (tipo=${id_tipo}, promo=${id_promocion})`);
    return null;
  }

  // Acumular si hay suscripción activa vigente
  const [[activa]] = await db.query(
    `SELECT fecha_fin FROM suscripciones
     WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
     ORDER BY fecha_fin DESC LIMIT 1`,
    [id_suscriptor]
  );

  let inicio, fin;
  if (planData.duracion_dias > 0) {
    if (activa) {
      inicio = new Date(activa.fecha_fin);
      inicio.setDate(inicio.getDate() + 1);
    } else {
      inicio = new Date();
    }
    fin = new Date(inicio);
    fin.setDate(fin.getDate() + planData.duracion_dias - 1);
  } else {
    // Solo sesiones, sin días adicionales
    inicio = new Date();
    fin = new Date();
  }

  const [result] = await db.query(
    `INSERT INTO suscripciones
       (id_suscriptor, id_tipo, id_promocion, fecha_inicio, fecha_fin,
        sesiones_nutriologo_restantes, sesiones_entrenador_restantes,
        estado, paypal_order_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`,
    [
      id_suscriptor, id_tipo || null, id_promocion || null,
      fmt(inicio), fmt(fin),
      planData.limite_sesiones_nutriologo,
      planData.limite_sesiones_entrenador,
      orderId,
    ]
  );

  console.log(`[PayPal] Suscripcion creada → id=${result.insertId}, suscriptor=${id_suscriptor}, plan="${planData.nombre}", ${fmt(inicio)} → ${fmt(fin)}`);

  return {
    id_suscripcion: result.insertId,
    fecha_inicio:   fmt(inicio),
    fecha_fin:      fmt(fin),
    estado:         'Activa',
    plan_nombre:    planData.nombre,
  };
}

// ============================================================================
//  POST /api/pagos/crear-orden
// ============================================================================
router.post('/crear-orden', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { id_suscriptor, id_tipo, id_promocion } = req.body;

    if (!id_suscriptor || (!id_tipo && !id_promocion)) {
      return res.status(400).json({ message: 'id_suscriptor y (id_tipo o id_promocion) son requeridos.' });
    }

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

    let plan;
    if (id_promocion) {
      [[plan]] = await db.query(
        `SELECT id_promocion AS id_tipo, nombre, precio, duracion_dias
         FROM promociones WHERE id_promocion = ? AND id_sucursal = ? AND activo = 1`,
        [id_promocion, id_sucursal]
      );
    } else {
      [[plan]] = await db.query(
        `SELECT id_tipo, nombre, precio, duracion_dias
         FROM tipos_suscripcion WHERE id_tipo = ? AND id_sucursal = ? AND activo = 1`,
        [id_tipo, id_sucursal]
      );
    }
    if (!plan) return res.status(404).json({ message: 'Plan o promoción no encontrado para esta sucursal.' });

    const [[suscriptor]] = await db.query(
      `SELECT id_suscriptor, nombres, apellido_paterno, correo
       FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
      [id_suscriptor]
    );
    if (!suscriptor) return res.status(404).json({ message: 'Suscriptor no encontrado.' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let customId;
    let returnUrl = `${frontendUrl}/suscripciones?pago=exitoso&sus=${id_suscriptor}`;
    if (id_promocion) {
      customId = `SUS-${id_suscriptor}-PROMO-${id_promocion}-${Date.now()}`;
      returnUrl += `&promo=${id_promocion}`;
    } else {
      customId = `SUS-${id_suscriptor}-TIPO-${id_tipo}-${Date.now()}`;
      returnUrl += `&tipo=${id_tipo}`;
    }

    const token = await getPayPalToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${token}`,
        'PayPal-Request-Id': customId,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id:   customId,
          description: `AXF Gym - ${plan.nombre} (${plan.duracion_dias} dias)`,
          amount: {
            currency_code: 'MXN',
            value:         Number(plan.precio).toFixed(2),
          },
        }],
        payer: {
          name: {
            given_name: suscriptor.nombres,
            surname:    suscriptor.apellido_paterno,
          },
          email_address: suscriptor.correo,
        },
        application_context: {
          brand_name:          'AXF Gym',
          locale:              'es-MX',
          landing_page:        'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action:         'PAY_NOW',
          return_url: returnUrl,
          cancel_url: `${frontendUrl}/suscripciones?pago=cancelado`,
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error(`[PayPal] Error creando orden: ${orderRes.status}`, err);
      return res.status(502).json({ message: 'Error al crear la orden en PayPal.', detalle: err });
    }

    const order       = await orderRes.json();
    const approveLink = order.links?.find(l => l.rel === 'approve')?.href;

    console.log(`[PayPal] Orden creada → id=${order.id}, approve_url=${approveLink}`);

    res.json({ order_id: order.id, approve_url: approveLink });

  } catch (error) {
    console.error('[PayPal] Error en crear-orden:', error?.message);
    res.status(500).json({ message: 'Error al crear la orden de pago.', detalle: error?.message });
  }
});

// ============================================================================
//  GET /api/pagos/confirmar/:token?sus=ID_SUSCRIPTOR&tipo=ID_TIPO
//  PayPal redirige al frontend con ?token=ORDER_ID&PayerID=XXX
//  El frontend llama a este endpoint con esos parámetros.
// ============================================================================
router.get('/confirmar/:token', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { token: orderId } = req.params;
    const sus   = req.query.sus;
    const tipo  = req.query.tipo;
    const promo = req.query.promo;

    if (!orderId || !sus || (!tipo && !promo)) {
      return res.status(400).json({ ok: false, message: 'Faltan parametros: token, sus, o tipo/promo.' });
    }

    const accessToken = await getPayPalToken();

    // Capturar la orden
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const captured = await captureRes.json();
    console.log(`[PayPal] capture status=${captured.status}, order=${orderId}`);

    if (captured.status !== 'COMPLETED') {
      return res.json({
        ok:      false,
        status:  captured.status,
        message: `Estado del pago: ${captured.status}`,
      });
    }

    const suscripcion = await registrarSuscripcion(orderId, Number(sus), tipo ? Number(tipo) : null, promo ? Number(promo) : null);
    if (!suscripcion) {
      return res.status(500).json({ ok: false, message: 'Pago capturado pero fallo la creacion de suscripcion. Ver logs.' });
    }

    return res.json({ ok: true, suscripcion });

  } catch (error) {
    console.error('[PayPal] Error en confirmar:', error?.message);
    res.status(500).json({ ok: false, message: 'Error al confirmar el pago.' });
  }
});

// ============================================================================
//  POST /api/pagos/capturar-orden
//  Usado por el flujo de Card Fields (pago inline, sin redirect).
//  El SDK de PayPal en el frontend crea la orden y aprueba el pago con la
//  tarjeta; este endpoint la captura y registra la suscripción en BD.
//  Body: { order_id, id_suscriptor, id_tipo }
// ============================================================================
router.post('/capturar-orden', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { order_id, id_suscriptor, id_tipo, id_promocion } = req.body;

    if (!order_id || !id_suscriptor || (!id_tipo && !id_promocion)) {
      return res.status(400).json({ ok: false, message: 'Faltan parametros: order_id, id_suscriptor o id_tipo/id_promocion.' });
    }

    const accessToken = await getPayPalToken();

    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const captured = await captureRes.json();
    console.log(`[PayPal CardFields] capture status=${captured.status}, order=${order_id}`);

    if (captured.status !== 'COMPLETED') {
      // Intentar extraer mensaje de error de PayPal
      const detalleError = captured?.details?.[0]?.description ?? captured?.message ?? `Estado: ${captured.status}`;
      return res.json({ ok: false, status: captured.status, message: detalleError });
    }

    const suscripcion = await registrarSuscripcion(order_id, Number(id_suscriptor), id_tipo ? Number(id_tipo) : null, id_promocion ? Number(id_promocion) : null);
    if (!suscripcion) {
      return res.status(500).json({ ok: false, message: 'Pago capturado pero fallo la creacion de suscripcion. Ver logs.' });
    }

    return res.json({ ok: true, suscripcion });

  } catch (error) {
    console.error('[PayPal] Error en capturar-orden:', error?.message);
    res.status(500).json({ ok: false, message: 'Error al capturar el pago.', detalle: error?.message });
  }
});

// ============================================================================
//  POST /api/pagos/webhook  (Produccion)
// ============================================================================
router.get('/webhook',  (_req, res) => res.sendStatus(200));
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  const eventType = req.body?.event_type;
  console.log(`[PayPal WEBHOOK] event_type=${eventType}`);

  if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') return;

  const resource = req.body?.resource;
  const orderId  = resource?.supplementary_data?.related_ids?.order_id;
  const customId = resource?.custom_id ?? '';

  if (!orderId) { console.warn('[PayPal WEBHOOK] Sin order_id en el recurso'); return; }

  const mTipo = customId.match(/^SUS-(\d+)-TIPO-(\d+)-/);
  const mPromo = customId.match(/^SUS-(\d+)-PROMO-(\d+)-/);
  
  if (!mTipo && !mPromo) { console.error('[PayPal WEBHOOK] No se pudo extraer IDs de custom_id:', customId); return; }

  try {
    if (mPromo) {
      await registrarSuscripcion(orderId, Number(mPromo[1]), null, Number(mPromo[2]));
    } else if (mTipo) {
      await registrarSuscripcion(orderId, Number(mTipo[1]), Number(mTipo[2]), null);
    }
  } catch (err) {
    console.error('[PayPal WEBHOOK] Error:', err?.message);
  }
});

export default router;
