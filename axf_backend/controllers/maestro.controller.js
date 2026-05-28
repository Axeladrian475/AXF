// ============================================================================
//  controllers/maestro.controller.js
//  Controlador para operaciones exclusivas del rol Maestro (Administrador Global).
//  Implementa borrado lógico transaccional para sucursales y dependencias.
// ============================================================================

import db from '../config/database.js';

/**
 * desactivarSucursal – Borrado lógico (Soft Delete) masivo con transacción SQL.
 *
 * Flujo:
 *   1. Verificar existencia de la sucursal.
 *   2. Validar que no esté ya desactivada.
 *   3. Iniciar transacción (BEGIN).
 *   4. Desactivar sucursal (activa = 0).
 *   5. Desactivar personal vinculado (activo = 0).
 *   6. Desactivar suscriptores registrados en esa sucursal (activo = 0).
 *   7. Confirmar transacción (COMMIT).
 *
 * En caso de error en cualquier UPDATE → ROLLBACK inmediato.
 *
 * @route DELETE /api/maestro/sucursales/:id_sucursal
 */
export async function desactivarSucursal(req, res) {
  const { id_sucursal } = req.params;
  let connection;

  try {
    // ─── 1. Obtener conexión dedicada del pool para la transacción ───────────
    connection = await db.getConnection();

    // ─── 2. Verificar que la sucursal existe ────────────────────────────────
    const [rows] = await connection.query(
      'SELECT id_sucursal, activa FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'La sucursal especificada no existe.'
      });
    }

    // ─── 3. Verificar que no esté ya desactivada ────────────────────────────
    if (rows[0].activa === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'La sucursal ya se encuentra desactivada.'
      });
    }

    // ─── 4. Iniciar transacción SQL ─────────────────────────────────────────
    await connection.beginTransaction();

    // ─── 5. Desactivar la sucursal ──────────────────────────────────────────
    await connection.query(
      'UPDATE sucursales SET activa = 0 WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // ─── 6. Desactivar en cascada al personal de esa sucursal ───────────────
    await connection.query(
      'UPDATE personal SET activo = 0 WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // ─── 7. Desactivar en cascada a los suscriptores ────────────────────────
    await connection.query(
      'UPDATE suscriptores SET activo = 0 WHERE id_sucursal_registro = ?',
      [id_sucursal]
    );

    // ─── 8. Confirmar la transacción ────────────────────────────────────────
    await connection.commit();
    connection.release();

    // ─── 9. Respuesta exitosa ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: 'Sucursal y dependencias desactivadas correctamente.'
    });

  } catch (error) {
    // ─── ROLLBACK: revertir cambios parciales ante cualquier fallo ───────────
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error('[DELETE /api/maestro/sucursales/:id_sucursal]', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al desactivar la sucursal.',
      detalle: error.message
    });
  }
}
