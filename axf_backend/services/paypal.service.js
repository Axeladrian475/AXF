// ============================================================================
//  services/paypal.service.js
//  Lógica compartida de PayPal Orders API v2 (web + app móvil)
// ============================================================================

import db from '../config/database.js';

export const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

export async function getPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error('[PayPal] PAYPAL_CLIENT_ID o PAYPAL_SECRET no definidos en .env');
  }

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

export async function registrarSuscripcion(orderId, id_suscriptor, id_tipo, id_promocion) {
  const fmt = (d) => d.toISOString().split('T')[0];
  console.log(`[PayPal] registrarSuscripcion → order_id=${orderId}, suscriptor=${id_suscriptor}, tipo=${id_tipo}, promo=${id_promocion}`);

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
      `SELECT duracion_dias, sesiones_nutriologo AS limite_sesiones_nutriologo,
              sesiones_entrenador AS limite_sesiones_entrenador, nombre
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

  const [[activa]] = await db.query(
    `SELECT id_suscripcion, fecha_fin FROM suscripciones
     WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()
     ORDER BY fecha_fin DESC LIMIT 1`,
    [id_suscriptor]
  );

  // Promoción solo sesiones (sin días): sumar a suscripción activa
  if (id_promocion && (!planData.duracion_dias || planData.duracion_dias <= 0)) {
    if (!activa) {
      console.error(`[PayPal] Promo solo sesiones pero suscriptor ${id_suscriptor} sin suscripción activa`);
      return null;
    }
    await db.query(
      `UPDATE suscripciones SET
         sesiones_nutriologo_restantes = sesiones_nutriologo_restantes + ?,
         sesiones_entrenador_restantes = sesiones_entrenador_restantes + ?,
         paypal_order_id = COALESCE(paypal_order_id, ?)
       WHERE id_suscripcion = ?`,
      [
        planData.limite_sesiones_nutriologo || 0,
        planData.limite_sesiones_entrenador || 0,
        orderId,
        activa.id_suscripcion,
      ]
    );
    return {
      id_suscripcion: activa.id_suscripcion,
      fecha_inicio:   fmt(new Date()),
      fecha_fin:      activa.fecha_fin,
      estado:         'Activa',
      plan_nombre:    planData.nombre,
      solo_sesiones:  true,
    };
  }

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

  console.log(`[PayPal] Suscripcion creada → id=${result.insertId}, suscriptor=${id_suscriptor}, plan="${planData.nombre}"`);

  return {
    id_suscripcion: result.insertId,
    fecha_inicio:   fmt(inicio),
    fecha_fin:      fmt(fin),
    estado:         'Activa',
    plan_nombre:    planData.nombre,
  };
}

export async function crearOrdenPayPal({
  id_suscriptor,
  id_tipo,
  id_promocion,
  id_sucursal,
  returnUrl,
  cancelUrl,
}) {
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
  if (!plan) return { error: 'Plan o promoción no encontrado para esta sucursal.', status: 404 };

  const [[suscriptor]] = await db.query(
    `SELECT id_suscriptor, nombres, apellido_paterno, correo, id_sucursal_registro
     FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
    [id_suscriptor]
  );
  if (!suscriptor) return { error: 'Suscriptor no encontrado.', status: 404 };
  if (suscriptor.id_sucursal_registro !== id_sucursal) {
    return { error: 'El plan no pertenece a tu sucursal.', status: 403 };
  }

  let customId;
  if (id_promocion) {
    customId = `SUS-${id_suscriptor}-PROMO-${id_promocion}-${Date.now()}`;
  } else {
    customId = `SUS-${id_suscriptor}-TIPO-${id_tipo}-${Date.now()}`;
  }

  const token = await getPayPalToken();

  const orderBody = {
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
  };

  if (returnUrl && cancelUrl) {
    orderBody.application_context = {
      brand_name:          'AXF Gym',
      locale:              'es-MX',
      landing_page:        'BILLING',
      shipping_preference: 'NO_SHIPPING',
      user_action:         'PAY_NOW',
      return_url:          returnUrl,
      cancel_url:          cancelUrl,
    };
  }

  const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'Authorization':   `Bearer ${token}`,
      'PayPal-Request-Id': customId,
    },
    body: JSON.stringify(orderBody),
  });

  if (!orderRes.ok) {
    const err = await orderRes.text();
    console.error(`[PayPal] Error creando orden: ${orderRes.status}`, err);
    return { error: 'Error al crear la orden en PayPal.', detalle: err, status: 502 };
  }

  const order       = await orderRes.json();
  const approveLink = order.links?.find(l => l.rel === 'approve')?.href;

  return {
    order_id:    order.id,
    approve_url: approveLink,
    plan_nombre: plan.nombre,
    precio:      plan.precio,
  };
}

export async function capturarOrdenPayPal(order_id) {
  const accessToken = await getPayPalToken();
  const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  return captureRes.json();
}
