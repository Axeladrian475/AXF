// ============================================================================
//  routes/movil.tienda.routes.js
//  Catálogo de suscripciones/promociones y pagos PayPal para la app móvil.
//  Montado en: /api/movil/tienda
// ============================================================================

import express from 'express';
import jwt     from 'jsonwebtoken';
import db      from '../config/database.js';
import {
  crearOrdenPayPal,
  capturarOrdenPayPal,
  registrarSuscripcion,
} from '../services/paypal.service.js';

const router = express.Router();

function verificarSuscriptor(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    if (req.usuario.rol !== 'suscriptor') {
      return res.status(403).json({ message: 'Acceso exclusivo para suscriptores' });
    }
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

async function getSucursalSuscriptor(id_suscriptor) {
  const [[sus]] = await db.query(
    `SELECT id_sucursal_registro FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
    [id_suscriptor]
  );
  return sus?.id_sucursal_registro ?? null;
}

// GET /api/movil/tienda/catalogo
router.get('/catalogo', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_sucursal = await getSucursalSuscriptor(id_suscriptor);
    if (!id_sucursal) {
      return res.status(404).json({ message: 'No se encontró la sucursal del suscriptor.' });
    }

    const [suscripciones] = await db.query(
      `SELECT id_tipo, nombre, duracion_dias, precio,
              limite_sesiones_nutriologo, limite_sesiones_entrenador
       FROM tipos_suscripcion
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY precio ASC`,
      [id_sucursal]
    );

    const [promociones] = await db.query(
      `SELECT id_promocion, nombre, descripcion, duracion_dias, precio,
              sesiones_nutriologo, sesiones_entrenador
       FROM promociones
       WHERE id_sucursal = ? AND activo = 1
       ORDER BY precio ASC, nombre ASC`,
      [id_sucursal]
    );

    const [[activa]] = await db.query(
      `SELECT MAX(fecha_fin) AS vencimiento_final
       FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND fecha_fin >= CURDATE()`,
      [id_suscriptor]
    );

    res.json({
      suscripciones,
      promociones,
      tiene_suscripcion_activa: !!activa?.vencimiento_final,
      vencimiento_final:          activa?.vencimiento_final ?? null,
    });
  } catch (err) {
    console.error('[GET /movil/tienda/catalogo]', err);
    res.status(500).json({ message: 'Error al obtener catálogo' });
  }
});

// GET /api/movil/tienda/paypal-config
router.get('/paypal-config', verificarSuscriptor, (_req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'PayPal no configurado en el servidor.' });
  }
  res.json({ client_id: clientId, currency: 'MXN' });
});

// POST /api/movil/tienda/crear-orden
// Body: { id_tipo?: number, id_promocion?: number }
router.post('/crear-orden', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { id_tipo, id_promocion } = req.body;

    if (!id_tipo && !id_promocion) {
      return res.status(400).json({ message: 'id_tipo o id_promocion es requerido.' });
    }

    const id_sucursal = await getSucursalSuscriptor(id_suscriptor);
    if (!id_sucursal) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    const result = await crearOrdenPayPal({
      id_suscriptor,
      id_tipo:      id_tipo ? Number(id_tipo) : null,
      id_promocion: id_promocion ? Number(id_promocion) : null,
      id_sucursal,
    });

    if (result.error) {
      return res.status(result.status || 500).json({ message: result.error, detalle: result.detalle });
    }

    res.json({
      order_id:    result.order_id,
      approve_url: result.approve_url,
      plan_nombre: result.plan_nombre,
      precio:      result.precio,
    });
  } catch (err) {
    console.error('[POST /movil/tienda/crear-orden]', err);
    res.status(500).json({ message: 'Error al crear la orden de pago.', detalle: err?.message });
  }
});

// POST /api/movil/tienda/capturar-orden
// Body: { order_id, id_tipo?: number, id_promocion?: number }
router.post('/capturar-orden', verificarSuscriptor, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const { order_id, id_tipo, id_promocion } = req.body;

    if (!order_id || (!id_tipo && !id_promocion)) {
      return res.status(400).json({ ok: false, message: 'order_id e id_tipo o id_promocion son requeridos.' });
    }

    const captured = await capturarOrdenPayPal(order_id);
    console.log(`[PayPal Movil] capture status=${captured.status}, order=${order_id}`);

    if (captured.status !== 'COMPLETED') {
      const detalleError = captured?.details?.[0]?.description ?? captured?.message ?? `Estado: ${captured.status}`;
      return res.json({ ok: false, status: captured.status, message: detalleError });
    }

    const suscripcion = await registrarSuscripcion(
      order_id,
      Number(id_suscriptor),
      id_tipo ? Number(id_tipo) : null,
      id_promocion ? Number(id_promocion) : null
    );

    if (!suscripcion) {
      return res.status(500).json({ ok: false, message: 'Pago capturado pero no se pudo registrar la suscripción.' });
    }

    return res.json({ ok: true, suscripcion });
  } catch (err) {
    console.error('[POST /movil/tienda/capturar-orden]', err);
    res.status(500).json({ ok: false, message: 'Error al capturar el pago.', detalle: err?.message });
  }
});

export default router;
