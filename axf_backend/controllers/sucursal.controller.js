// ============================================================================
//  controllers/sucursal.controller.js
//  Borrado físico transaccional de una sucursal y dependencias.
//  Preserva datos multisucursales (suscriptores migrados, catálogo compartido).
// ============================================================================

import db from '../config/database.js';

/** Ejecuta DELETE solo si hay IDs; evita IN () vacío. */
async function deleteIfAny(connection, sql, ids, extraParams = []) {
  if (!ids?.length) return;
  await connection.query(sql, [...extraParams, ids]);
}

/**
 * deleteSucursal – DELETE /api/maestro/sucursales/:id_sucursal
 *
 * Elimina la sucursal y en cascada personal, suscriptores locales y datos
 * vinculados. No toca:
 *  - Suscriptores con id_sucursal_registro distinto (migrados a otra sucursal)
 *  - Suscripciones / tipos / promos aún referenciados por esos suscriptores
 *  - Recetas, ingredientes o ejercicios usados fuera de la sucursal
 *  - Tablas globales (administradores, hardware_sesiones)
 */
export async function deleteSucursal(req, res) {
  const id_sucursal = Number(req.params.id_sucursal);
  if (!Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    return res.status(400).json({ success: false, message: 'ID de sucursal inválido.' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const [[sucursal]] = await connection.query(
      'SELECT id_sucursal, nombre, activa FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    if (!sucursal) {
      connection.release();
      return res.status(404).json({ success: false, message: 'La sucursal especificada no existe.' });
    }

    const [personalRows] = await connection.query(
      'SELECT id_personal FROM personal WHERE id_sucursal = ?',
      [id_sucursal]
    );
    const personalIds = personalRows.map(r => r.id_personal);

    const [suscriptorRows] = await connection.query(
      'SELECT id_suscriptor FROM suscriptores WHERE id_sucursal_registro = ?',
      [id_sucursal]
    );
    const suscriptorIds = suscriptorRows.map(r => r.id_suscriptor);

    await connection.beginTransaction();

    // ── Reportes (sucursal + suscriptores que se eliminan) ───────────────────
    await connection.query(
      `DELETE sr FROM strikes_reporte sr
       INNER JOIN reportes r ON r.id_reporte = sr.id_reporte
       WHERE r.id_sucursal = ?`,
      [id_sucursal]
    );
    await deleteIfAny(
      connection,
      `DELETE sr FROM strikes_reporte sr
       INNER JOIN reportes r ON r.id_reporte = sr.id_reporte
       WHERE r.id_suscriptor IN (?)`,
      suscriptorIds
    );

    await connection.query(
      `DELETE rs FROM reporte_sumados rs
       INNER JOIN reportes r ON r.id_reporte = rs.id_reporte
       WHERE r.id_sucursal = ?`,
      [id_sucursal]
    );
    await deleteIfAny(
      connection,
      `DELETE rs FROM reporte_sumados rs
       INNER JOIN reportes r ON r.id_reporte = rs.id_reporte
       WHERE r.id_suscriptor IN (?)`,
      suscriptorIds
    );

    await connection.query('DELETE FROM reportes WHERE id_sucursal = ?', [id_sucursal]);
    await deleteIfAny(connection, 'DELETE FROM reportes WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Accesos en la sucursal + historial de suscriptores eliminados ────────
    await connection.query('DELETE FROM accesos WHERE id_sucursal = ?', [id_sucursal]);
    await deleteIfAny(connection, 'DELETE FROM accesos WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Avisos internos ─────────────────────────────────────────────────────
    await connection.query(
      `DELETE ad FROM aviso_destinatarios ad
       INNER JOIN avisos a ON a.id_aviso = ad.id_aviso
       WHERE a.id_sucursal = ?`,
      [id_sucursal]
    );
    await connection.query('DELETE FROM avisos WHERE id_sucursal = ?', [id_sucursal]);

    // ── Chat (pares locales; suscriptores eliminados pierden todo su chat) ──
    if (personalIds.length && suscriptorIds.length) {
      await connection.query(
        'DELETE FROM chat_mensajes WHERE id_personal IN (?) AND id_suscriptor IN (?)',
        [personalIds, suscriptorIds]
      );
    }
    await deleteIfAny(connection, 'DELETE FROM chat_mensajes WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Entrenamiento ───────────────────────────────────────────────────────
    await deleteIfAny(connection, 'DELETE FROM registro_entrenamiento WHERE id_suscriptor IN (?)', suscriptorIds);
    await deleteIfAny(
      connection,
      `DELETE rej FROM rutina_ejercicios rej
       INNER JOIN rutinas ru ON ru.id_rutina = rej.id_rutina
       WHERE ru.id_suscriptor IN (?)`,
      suscriptorIds
    );
    await deleteIfAny(connection, 'DELETE FROM rutinas WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Nutrición (solo dietas de suscriptores locales) ─────────────────────
    await deleteIfAny(
      connection,
      `DELETE dc FROM dieta_comidas dc
       INNER JOIN dietas d ON d.id_dieta = dc.id_dieta
       WHERE d.id_suscriptor IN (?)`,
      suscriptorIds
    );
    await deleteIfAny(connection, 'DELETE FROM dietas WHERE id_suscriptor IN (?)', suscriptorIds);
    await deleteIfAny(connection, 'DELETE FROM registros_fisicos WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Canjes (personal de la sucursal o suscriptores locales) ─────────────
    await connection.query(
      `DELETE c FROM canjes c
       INNER JOIN recompensas rec ON rec.id_recompensa = c.id_recompensa
       WHERE rec.id_sucursal = ?`,
      [id_sucursal]
    );
    await deleteIfAny(connection, 'DELETE FROM canjes WHERE id_personal IN (?)', personalIds);
    await deleteIfAny(connection, 'DELETE FROM canjes WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Suscripciones solo de suscriptores locales ──────────────────────────
    await deleteIfAny(connection, 'DELETE FROM suscripciones WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Huellas en sensores ─────────────────────────────────────────────────
    await deleteIfAny(connection, 'DELETE FROM sensor_huella_posiciones WHERE id_suscriptor IN (?)', suscriptorIds);
    await connection.query(
      `DELETE shp FROM sensor_huella_posiciones shp
       INNER JOIN sensores s ON s.sensor_id = shp.sensor_id
       WHERE s.id_sucursal = ?`,
      [id_sucursal]
    );

    // ── Suscriptores locales (multisucursales migrados no coinciden aquí) ───
    await deleteIfAny(connection, 'DELETE FROM suscriptores WHERE id_suscriptor IN (?)', suscriptorIds);

    // ── Recompensas, promos y tipos de la sucursal ──────────────────────────
    await connection.query('DELETE FROM recompensas WHERE id_sucursal = ?', [id_sucursal]);

    // Desvincular planes/promos multisucursales antes de borrar catálogo local
    await connection.query(
      `UPDATE suscripciones s
       INNER JOIN promociones p ON p.id_promocion = s.id_promocion
       SET s.id_promocion = NULL
       WHERE p.id_sucursal = ?`,
      [id_sucursal]
    );
    await connection.query(
      `UPDATE suscripciones s
       INNER JOIN tipos_suscripcion t ON t.id_tipo = s.id_tipo
       SET s.id_tipo = NULL
       WHERE t.id_sucursal = ?`,
      [id_sucursal]
    );

    await connection.query('DELETE FROM promociones WHERE id_sucursal = ?', [id_sucursal]);
    await connection.query('DELETE FROM tipos_suscripcion WHERE id_sucursal = ?', [id_sucursal]);

    // ── Sensores ────────────────────────────────────────────────────────────
    await connection.query('DELETE FROM sensores WHERE id_sucursal = ?', [id_sucursal]);

    // ── Catálogo creado por personal local (solo si no es compartido) ───────
    if (personalIds.length) {
      await connection.query(
        `DELETE ri FROM receta_ingredientes ri
         INNER JOIN recetas r ON r.id_receta = ri.id_receta
         WHERE r.creado_por IN (?)
           AND NOT EXISTS (
             SELECT 1 FROM dieta_comidas dc WHERE dc.id_receta = r.id_receta
           )`,
        [personalIds]
      );

      await connection.query(
        `DELETE r FROM recetas r
         WHERE r.creado_por IN (?)
           AND NOT EXISTS (
             SELECT 1 FROM dieta_comidas dc WHERE dc.id_receta = r.id_receta
           )`,
        [personalIds]
      );

      await connection.query(
        `DELETE i FROM ingredientes i
         WHERE i.creado_por IN (?)
           AND NOT EXISTS (
             SELECT 1 FROM receta_ingredientes ri WHERE ri.id_ingrediente = i.id_ingrediente
           )`,
        [personalIds]
      );

      await connection.query(
        `DELETE e FROM ejercicios e
         WHERE e.creado_por IN (?)
           AND NOT EXISTS (
             SELECT 1 FROM rutina_ejercicios rej WHERE rej.id_ejercicio = e.id_ejercicio
           )`,
        [personalIds]
      );
    }

    // ── Desvincular personal local de datos multisucursales que permanecen ──
    if (personalIds.length) {
      const externos = suscriptorIds.length ? suscriptorIds : [0];
      const nullables = [
        ['dietas', 'id_nutriologo'],
        ['rutinas', 'id_entrenador'],
        ['registros_fisicos', 'id_nutriologo'],
      ];
      for (const [tabla, columna] of nullables) {
        try {
          await connection.query(
            `UPDATE ${tabla} SET ${columna} = NULL
             WHERE ${columna} IN (?) AND id_suscriptor NOT IN (?)`,
            [personalIds, externos]
          );
        } catch {
          // Si la columna sigue NOT NULL, ver sql/eliminar_sucursal_multisucursal.sql
        }
      }
    }

    // ── Config, aforo, personal y sucursal ────────────────────────────────────
    await connection.query('DELETE FROM config_reportes_periodicos WHERE id_sucursal = ?', [id_sucursal]);
    await connection.query('DELETE FROM sucursal_aforo WHERE id_sucursal = ?', [id_sucursal]);
    await connection.query('DELETE FROM personal WHERE id_sucursal = ?', [id_sucursal]);
    await connection.query('DELETE FROM sucursales WHERE id_sucursal = ?', [id_sucursal]);

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: `Sucursal "${sucursal.nombre}" y todos sus datos locales eliminados correctamente.`,
      eliminados: {
        personal: personalIds.length,
        suscriptores: suscriptorIds.length,
      },
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* noop */ }
      connection.release();
    }

    console.error('[DELETE /api/maestro/sucursales/:id_sucursal]', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la sucursal. Ningún cambio fue aplicado.',
      detalle: error.message,
    });
  }
}
