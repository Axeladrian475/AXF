// ============================================================================
//  controllers/sucursal.controller.js
//  Controlador responsable del borrado lógico (soft delete) transaccional
//  para una sucursal y sus dependencias (personal y suscriptores).
//  Implementación en SQL puro usando `mysql2/promise` desde el pool.
// ============================================================================

import db from '../config/database.js';

/**
 * deleteSucursal – Ejecuta un borrado físico (hard delete) en una transacción SQL.
 *
 * Endpoint: DELETE /api/maestro/sucursales/:id_sucursal
 * Reglas:
 *  - Uso de transacción (BEGIN / COMMIT / ROLLBACK) para garantizar atomicidad.
 *  - Elimina en cascada: personal, suscriptores, y luego sucursal.
 *  - Consultas parametrizadas para evitar inyección SQL.
 *  - Try/Catch estricto y rollback inmediato en caso de error.
 */
export async function deleteSucursal(req, res) {
  const { id_sucursal } = req.params;
  let connection;

  try {
    // Obtener conexión dedicada del pool (necesaria para transacciones)
    connection = await db.getConnection();

    // Verificar existencia de la sucursal
    const [rows] = await connection.query(
      'SELECT id_sucursal FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'La sucursal especificada no existe.' });
    }

    // Iniciar transacción
    await connection.beginTransaction();

    // Eliminar personal vinculado a la sucursal (evita FK constraint)
    await connection.query(
      'DELETE FROM personal WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // Eliminar suscriptores registrados en la sucursal
    await connection.query(
      'DELETE FROM suscriptores WHERE id_sucursal_registro = ?',
      [id_sucursal]
    );

    // Eliminar la sucursal
    await connection.query(
      'DELETE FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // Confirmar la transacción
    await connection.commit();
    connection.release();

    return res.status(200).json({ success: true, message: 'Sucursal y dependencias eliminadas correctamente.' });

  } catch (error) {
    // Si algo falla, revertir la transacción inmediatamente
    if (connection) {
      try { await connection.rollback(); } catch (e) { /* noop */ }
      connection.release();
    }

    console.error('[DELETE /api/maestro/sucursales/:id_sucursal] Error:', error);
    return res.status(500).json({ success: false, message: 'Error interno al eliminar la sucursal.' });
  }
}
