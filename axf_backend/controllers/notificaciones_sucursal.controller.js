import db from '../config/database.js';

export async function obtenerNotificaciones(req, res) {
  try {
    const id_sucursal = req.usuario.id;

    const [notificaciones] = await db.query(
      `SELECT * FROM notificaciones_sucursal
       WHERE id_sucursal = ?
       ORDER BY creado_en DESC
       LIMIT 50`,
      [id_sucursal]
    );

    const [[{ no_leidas }]] = await db.query(
      `SELECT COUNT(*) AS no_leidas
       FROM notificaciones_sucursal
       WHERE id_sucursal = ? AND leida = 0`,
      [id_sucursal]
    );

    res.json({ notificaciones, no_leidas });
  } catch (error) {
    console.error('[GET /notificaciones-sucursal]', error);
    res.status(500).json({ message: 'Error al obtener notificaciones.' });
  }
}

export async function marcarLeida(req, res) {
  try {
    const { id } = req.params;
    const id_sucursal = req.usuario.id;

    await db.query(
      `UPDATE notificaciones_sucursal SET leida = 1 WHERE id_notificacion = ? AND id_sucursal = ?`,
      [id, id_sucursal]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[PUT /notificaciones-sucursal/:id/leer]', error);
    res.status(500).json({ message: 'Error al marcar leída.' });
  }
}

export async function marcarTodasLeidas(req, res) {
  try {
    const id_sucursal = req.usuario.id;

    await db.query(
      `UPDATE notificaciones_sucursal SET leida = 1 WHERE id_sucursal = ? AND leida = 0`,
      [id_sucursal]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[PUT /notificaciones-sucursal/leer-todas]', error);
    res.status(500).json({ message: 'Error al marcar todas leídas.' });
  }
}
