// ============================================================================
//  routes/pagos.routes.js
//  Integración con PayPal — Orders API v2
// ============================================================================

import express from 'express';
import db from '../config/database.js';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';
import {
  crearOrdenPayPal,
  capturarOrdenPayPal,
  registrarSuscripcion,
} from '../services/paypal.service.js';

const router = express.Router();

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

    const frontendUrl = process.env.FRONTEND_URL || 'https://axfgymnet.com';
    let returnUrl = `${frontendUrl}/suscripciones?pago=exitoso&sus=${id_suscriptor}`;
    if (id_promocion) returnUrl += `&promo=${id_promocion}`;
    else returnUrl += `&tipo=${id_tipo}`;

    const result = await crearOrdenPayPal({
      id_suscriptor,
      id_tipo:      id_tipo ? Number(id_tipo) : null,
      id_promocion: id_promocion ? Number(id_promocion) : null,
      id_sucursal,
      returnUrl,
      cancelUrl: `${frontendUrl}/suscripciones?pago=cancelado`,
    });

    if (result.error) {
      return res.status(result.status || 500).json({ message: result.error, detalle: result.detalle });
    }

    console.log(`[PayPal] Orden creada → id=${result.order_id}`);
    res.json({ order_id: result.order_id, approve_url: result.approve_url });

  } catch (error) {
    console.error('[PayPal] Error en crear-orden:', error?.message);
    res.status(500).json({ message: 'Error al crear la orden de pago.', detalle: error?.message });
  }
});

// ============================================================================
//  GET /api/pagos/confirmar/:token?sus=ID_SUSCRIPTOR&tipo=ID_TIPO
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

    const captured = await capturarOrdenPayPal(orderId);
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
// ============================================================================
router.post('/capturar-orden', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { order_id, id_suscriptor, id_tipo, id_promocion } = req.body;

    if (!order_id || !id_suscriptor || (!id_tipo && !id_promocion)) {
      return res.status(400).json({ ok: false, message: 'Faltan parametros: order_id, id_suscriptor o id_tipo/id_promocion.' });
    }

    const captured = await capturarOrdenPayPal(order_id);
    console.log(`[PayPal CardFields] capture status=${captured.status}, order=${order_id}`);

    if (captured.status !== 'COMPLETED') {
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
