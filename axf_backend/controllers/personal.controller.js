// ============================================================================
//  controllers/personal.controller.js
//  Borrado físico transaccional de un empleado y datos vinculados a él.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function borrarFotoPersonal(foto_url) {
  if (!foto_url) return;
  const filePath = path.resolve(__dirname, '..', foto_url.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/**
 * @param {object} [opts]
 * @param {number[]|null} [opts.suscriptorIdsLimite]
 *   Si se define (borrado de sucursal), solo elimina rutinas/dietas/chat de ese
 *   empleado con esos suscriptores. Si es null (borrado de un empleado), elimina
 *   todo lo vinculado al id_personal.
 */
export async function eliminarDatosDePersonal(connection, id_personal, opts = {}) {
  const { suscriptorIdsLimite = null } = opts;
  const filtraSusc = suscriptorIdsLimite !== null;
  const susIds = filtraSusc && suscriptorIdsLimite.length ? suscriptorIdsLimite : [0];

  // ── Rutinas del entrenador ────────────────────────────────────────────────
  if (filtraSusc) {
    await connection.query(
      `DELETE re FROM registro_entrenamiento re
       INNER JOIN rutina_ejercicios rej ON rej.id = re.id_rutina_ejercicio
       INNER JOIN rutinas ru ON ru.id_rutina = rej.id_rutina
       WHERE ru.id_entrenador = ? AND ru.id_suscriptor IN (?)`,
      [id_personal, susIds]
    );
    await connection.query(
      `DELETE rej FROM rutina_ejercicios rej
       INNER JOIN rutinas ru ON ru.id_rutina = rej.id_rutina
       WHERE ru.id_entrenador = ? AND ru.id_suscriptor IN (?)`,
      [id_personal, susIds]
    );
    await connection.query(
      'DELETE FROM rutinas WHERE id_entrenador = ? AND id_suscriptor IN (?)',
      [id_personal, susIds]
    );
  } else {
    await connection.query(
      `DELETE re FROM registro_entrenamiento re
       INNER JOIN rutina_ejercicios rej ON rej.id = re.id_rutina_ejercicio
       INNER JOIN rutinas ru ON ru.id_rutina = rej.id_rutina
       WHERE ru.id_entrenador = ?`,
      [id_personal]
    );
    await connection.query(
      `DELETE rej FROM rutina_ejercicios rej
       INNER JOIN rutinas ru ON ru.id_rutina = rej.id_rutina
       WHERE ru.id_entrenador = ?`,
      [id_personal]
    );
    await connection.query('DELETE FROM rutinas WHERE id_entrenador = ?', [id_personal]);
  }

  // ── Dietas del nutriólogo ─────────────────────────────────────────────────
  if (filtraSusc) {
    await connection.query(
      `DELETE dc FROM dieta_comidas dc
       INNER JOIN dietas d ON d.id_dieta = dc.id_dieta
       WHERE d.id_nutriologo = ? AND d.id_suscriptor IN (?)`,
      [id_personal, susIds]
    );
    await connection.query(
      'DELETE FROM dietas WHERE id_nutriologo = ? AND id_suscriptor IN (?)',
      [id_personal, susIds]
    );
    await connection.query(
      'DELETE FROM registros_fisicos WHERE id_nutriologo = ? AND id_suscriptor IN (?)',
      [id_personal, susIds]
    );
    await connection.query(
      'DELETE FROM chat_mensajes WHERE id_personal = ? AND id_suscriptor IN (?)',
      [id_personal, susIds]
    );
  } else {
    await connection.query(
      `DELETE dc FROM dieta_comidas dc
       INNER JOIN dietas d ON d.id_dieta = dc.id_dieta
       WHERE d.id_nutriologo = ?`,
      [id_personal]
    );
    await connection.query('DELETE FROM dietas WHERE id_nutriologo = ?', [id_personal]);
    await connection.query('DELETE FROM registros_fisicos WHERE id_nutriologo = ?', [id_personal]);
    await connection.query('DELETE FROM chat_mensajes WHERE id_personal = ?', [id_personal]);
  }

  // ── Canjes y avisos (siempre del empleado) ────────────────────────────────
  await connection.query('DELETE FROM canjes WHERE id_personal = ?', [id_personal]);
  await connection.query('DELETE FROM aviso_destinatarios WHERE id_personal = ?', [id_personal]);

  // ── Catálogo creado por este empleado (solo si no está compartido) ────────
  await connection.query(
    `DELETE ri FROM receta_ingredientes ri
     INNER JOIN recetas r ON r.id_receta = ri.id_receta
     WHERE r.creado_por = ?
       AND NOT EXISTS (
         SELECT 1 FROM dieta_comidas dc WHERE dc.id_receta = r.id_receta
       )`,
    [id_personal]
  );
  await connection.query(
    `DELETE r FROM recetas r
     WHERE r.creado_por = ?
       AND NOT EXISTS (
         SELECT 1 FROM dieta_comidas dc WHERE dc.id_receta = r.id_receta
       )`,
    [id_personal]
  );
  await connection.query(
    `DELETE i FROM ingredientes i
     WHERE i.creado_por = ?
       AND NOT EXISTS (
         SELECT 1 FROM receta_ingredientes ri WHERE ri.id_ingrediente = i.id_ingrediente
       )`,
    [id_personal]
  );
  await connection.query(
    `DELETE e FROM ejercicios e
     WHERE e.creado_por = ?
       AND NOT EXISTS (
         SELECT 1 FROM rutina_ejercicios rej WHERE rej.id_ejercicio = e.id_ejercicio
       )`,
    [id_personal]
  );

  // reportes.id_personal_reportado → ON DELETE SET NULL en BD
}

/**
 * deletePersonal – DELETE /api/personal/:id
 */
export async function deletePersonal(req, res) {
  const id_personal = Number(req.params.id);
  const id_sucursal = Number(req.usuario.id);

  if (!Number.isInteger(id_personal) || id_personal <= 0) {
    return res.status(400).json({ success: false, message: 'ID de empleado inválido.' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const [[empleado]] = await connection.query(
      `SELECT id_personal, nombres, apellido_paterno, foto_url
       FROM personal
       WHERE id_personal = ? AND id_sucursal = ? AND activo = 1`,
      [id_personal, id_sucursal]
    );

    if (!empleado) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Empleado no encontrado.' });
    }

    await connection.beginTransaction();
    await eliminarDatosDePersonal(connection, id_personal);
    await connection.query(
      'DELETE FROM personal WHERE id_personal = ? AND id_sucursal = ?',
      [id_personal, id_sucursal]
    );
    await connection.commit();
    connection.release();

    borrarFotoPersonal(empleado.foto_url);

    const nombre = `${empleado.nombres} ${empleado.apellido_paterno}`.trim();
    return res.json({
      success: true,
      message: `Empleado "${nombre}" y sus datos relacionados eliminados correctamente.`,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* noop */ }
      connection.release();
    }

    console.error('[DELETE /personal/:id]', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar empleado. Ningún cambio fue aplicado.',
      detalle: error.message,
    });
  }
}
