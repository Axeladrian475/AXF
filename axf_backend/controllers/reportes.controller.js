// ============================================================================
//  controllers/reportes.controller.js
//
//  Lógica de negocio para el Módulo de Gestión de Alertas y Escalada.
//  Tablas: reportes, strikes_reporte, personal, sucursales, suscriptores
// ============================================================================

import db from '../config/database.js';

// ════════════════════════════════════════════════════════════════════════════
// GET /api/reportes
// Lista reportes con filtros: id, suscriptor, sucursal, estado, nivel_strike
//
// Query params:
//   q           → buscar por ID, nombre suscriptor
//   id_sucursal → filtrar por sucursal (maestro puede ver todas)
//   estado      → Abierto | En_Proceso | Resuelto
//   strike      → 0 | 1 | 2 | 3
//   limite      → default 50
//   offset      → default 0
// ════════════════════════════════════════════════════════════════════════════
export async function listarReportes(req, res) {
  try {
    const { q = '', estado, strike, categoria, limite = 50, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limite) || 50, 200);
    const off = parseInt(offset) || 0;

    // Determinar qué sucursales puede ver el usuario
    let id_sucursal_filtro = null;
    if (req.usuario.rol === 'sucursal') {
      id_sucursal_filtro = req.usuario.id;
    } else if (req.usuario.rol === 'personal') {
      // Personal solo ve reportes de su sucursal
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
        [req.usuario.id]
      );
      id_sucursal_filtro = emp?.id_sucursal ?? null;
    }
    // maestro → id_sucursal_filtro = null → ve todas

    // Construir WHERE dinámico
    const conditions = [];
    const params = [];

    if (id_sucursal_filtro) {
      conditions.push('r.id_sucursal = ?');
      params.push(id_sucursal_filtro);
    }
    if (estado && ['Abierto', 'En_Proceso', 'Resuelto'].includes(estado)) {
      conditions.push('r.estado = ?');
      params.push(estado);
    }
    if (strike !== undefined && strike !== '') {
      conditions.push('r.num_strikes = ?');
      params.push(parseInt(strike));
    }
    if (categoria && categoria.trim()) {
      conditions.push('r.categoria = ?');
      params.push(categoria.trim());
    }
    if (q.trim()) {
      conditions.push(`(
        CAST(r.id_reporte AS CHAR) LIKE ? OR
        CONCAT(s.nombres, ' ', s.apellido_paterno) LIKE ? OR
        suc.nombre LIKE ?
      )`);
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }

    // El personal NO ve los reportes de personal — son responsabilidad del encargado de sucursal
    if (req.usuario.rol === 'personal') {
      conditions.push(`r.categoria != 'Reporte_Personal'`);
    }

    const WHERE = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.categoria,
         r.descripcion,
         r.foto_url,
         r.es_privado,
         r.estado,
         r.num_strikes,
         r.creado_en,
         r.resuelto_en,
         CONCAT(s.nombres, ' ', s.apellido_paterno) AS nombre_suscriptor,
         s.correo                                   AS correo_suscriptor,
         suc.nombre                                 AS nombre_sucursal,
         suc.id_sucursal,
         -- Personal reportado (si aplica)
         CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre_personal_reportado,
         p.puesto                                   AS puesto_personal_reportado,
         -- Último strike registrado
         (SELECT sr.generado_en
          FROM strikes_reporte sr
          WHERE sr.id_reporte = r.id_reporte
          ORDER BY sr.nivel DESC LIMIT 1)           AS ultimo_strike_en,
         -- Horas desde creación (para calcular urgencia en frontend)
         TIMESTAMPDIFF(HOUR, r.creado_en, NOW())    AS horas_desde_creacion
       FROM reportes r
       INNER JOIN suscriptores s   ON s.id_suscriptor = r.id_suscriptor
       INNER JOIN sucursales suc   ON suc.id_sucursal  = r.id_sucursal
       LEFT  JOIN personal p       ON p.id_personal   = r.id_personal_reportado
       ${WHERE}
       ORDER BY r.num_strikes DESC, r.creado_en ASC
       LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM reportes r
       INNER JOIN suscriptores s  ON s.id_suscriptor = r.id_suscriptor
       INNER JOIN sucursales suc  ON suc.id_sucursal  = r.id_sucursal
       ${WHERE}`,
      params
    );

    res.json({ reportes, total, limite: lim, offset: off });
  } catch (error) {
    console.error('[GET /reportes]', error);
    res.status(500).json({ message: 'Error al obtener reportes.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/reportes/:id
// Detalle completo de un reporte + historial de strikes
// ════════════════════════════════════════════════════════════════════════════
export async function obtenerReporte(req, res) {
  try {
    const { id } = req.params;

    const [[reporte]] = await db.query(
      `SELECT
         r.*,
         CONCAT(s.nombres, ' ', s.apellido_paterno)  AS nombre_suscriptor,
         s.correo                                     AS correo_suscriptor,
         s.telefono                                   AS telefono_suscriptor,
         suc.nombre                                   AS nombre_sucursal,
         -- Personal reportado (si aplica)
         CONCAT(p.nombres, ' ', p.apellido_paterno)   AS nombre_personal_reportado,
         p.puesto                                     AS puesto_personal_reportado,
         TIMESTAMPDIFF(HOUR, r.creado_en, NOW())      AS horas_desde_creacion
       FROM reportes r
       INNER JOIN suscriptores s ON s.id_suscriptor = r.id_suscriptor
       INNER JOIN sucursales suc ON suc.id_sucursal  = r.id_sucursal
       LEFT  JOIN personal p     ON p.id_personal    = r.id_personal_reportado
       WHERE r.id_reporte = ?`,
      [id]
    );

    if (!reporte) {
      return res.status(404).json({ message: 'Reporte no encontrado.' });
    }

    // Historial de strikes del reporte
    const [strikes] = await db.query(
      `SELECT id_strike, nivel, notificados, generado_en
       FROM strikes_reporte
       WHERE id_reporte = ?
       ORDER BY nivel ASC`,
      [id]
    );

    // Suscriptores sumados al reporte
    const [sumados] = await db.query(
      `SELECT rs.sumado_en,
              CONCAT(s.nombres, ' ', s.apellido_paterno) AS nombre
       FROM reporte_sumados rs
       INNER JOIN suscriptores s ON s.id_suscriptor = rs.id_suscriptor
       WHERE rs.id_reporte = ?`,
      [id]
    );

    res.json({ ...reporte, historial_strikes: strikes, sumados });
  } catch (error) {
    console.error('[GET /reportes/:id]', error);
    res.status(500).json({ message: 'Error al obtener el reporte.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/reportes/:id/estado
// Actualizar el estado de un reporte (Abierto → En_Proceso → Resuelto).
// Solo personal y sucursal pueden hacerlo.
//
// Body: { estado: "En_Proceso" | "Resuelto" }
// ════════════════════════════════════════════════════════════════════════════
export async function actualizarEstado(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Abierto', 'En_Proceso', 'Resuelto'].includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido. Usa: Abierto, En_Proceso o Resuelto.' });
    }

    const [[reporte]] = await db.query(
      `SELECT id_reporte, estado, id_sucursal FROM reportes WHERE id_reporte = ?`,
      [id]
    );
    if (!reporte) return res.status(404).json({ message: 'Reporte no encontrado.' });

    // Si ya está resuelto, no se puede reabrir vía este endpoint
    if (reporte.estado === 'Resuelto' && estado !== 'Resuelto') {
      return res.status(409).json({ message: 'No se puede cambiar el estado de un reporte ya resuelto.' });
    }

    const resuelto_en = estado === 'Resuelto' ? 'NOW()' : 'resuelto_en';

    await db.query(
      `UPDATE reportes
         SET estado = ?,
             resuelto_en = ${estado === 'Resuelto' ? 'NOW()' : 'resuelto_en'}
       WHERE id_reporte = ?`,
      [estado, id]
    );

    res.json({ message: `Estado actualizado a "${estado}".`, id_reporte: reporte.id_reporte });
  } catch (error) {
    console.error('[PUT /reportes/:id/estado]', error);
    res.status(500).json({ message: 'Error al actualizar el estado.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/reportes/:id/resolver
// Marcar como resuelto con descripción de resolución.
//
// Body: { descripcion_resolucion?: string }
// ════════════════════════════════════════════════════════════════════════════
export async function resolverReporte(req, res) {
  try {
    const { id } = req.params;

    const [[reporte]] = await db.query(
      `SELECT id_reporte, estado FROM reportes WHERE id_reporte = ?`, [id]
    );
    if (!reporte) return res.status(404).json({ message: 'Reporte no encontrado.' });
    // Eliminar el reporte — reporte_sumados y strikes_reporte se borran por CASCADE
    await db.query(`DELETE FROM reportes WHERE id_reporte = ?`, [id]);

    res.json({ message: 'Reporte resuelto y eliminado correctamente.', id_reporte: parseInt(id) });
  } catch (error) {
    console.error('[POST /reportes/:id/resolver]', error);
    res.status(500).json({ message: 'Error al resolver el reporte.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/reportes/:id/strikes
// Historial de strikes de un reporte específico
// ════════════════════════════════════════════════════════════════════════════
export async function historialStrikes(req, res) {
  try {
    const { id } = req.params;

    const [strikes] = await db.query(
      `SELECT sr.id_strike, sr.nivel, sr.notificados, sr.generado_en,
              r.num_strikes, r.estado, r.creado_en AS reporte_creado_en,
              TIMESTAMPDIFF(HOUR, r.creado_en, sr.generado_en) AS horas_al_strike
       FROM strikes_reporte sr
       INNER JOIN reportes r ON r.id_reporte = sr.id_reporte
       WHERE sr.id_reporte = ?
       ORDER BY sr.nivel ASC`,
      [id]
    );

    res.json(strikes);
  } catch (error) {
    console.error('[GET /reportes/:id/strikes]', error);
    res.status(500).json({ message: 'Error al obtener historial de strikes.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/reportes/resumen
// Contadores para el dashboard: total por estado y por nivel de strike
// (Filtrado automáticamente por sucursal del usuario)
// ════════════════════════════════════════════════════════════════════════════
export async function resumenReportes(req, res) {
  try {
    let id_sucursal = null;
    if (req.usuario.rol === 'sucursal') {
      id_sucursal = req.usuario.id;
    } else if (req.usuario.rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
        [req.usuario.id]
      );
      id_sucursal = emp?.id_sucursal ?? null;
    }

    // El personal NO ve reportes de personal en sus contadores
    const excluirPersonal = req.usuario.rol === 'personal' ? `AND categoria != 'Reporte_Personal'` : '';
    const filtroSuc = id_sucursal ? 'AND id_sucursal = ?' : '';
    const paramSuc  = id_sucursal ? [id_sucursal] : [];

    const [[totales]] = await db.query(
      `SELECT
         COUNT(*)                                                          AS total,
         SUM(estado = 'Abierto')                                          AS abiertos,
         SUM(estado = 'En_Proceso')                                       AS en_proceso,
         SUM(estado = 'Resuelto')                                         AS resueltos,
         SUM(num_strikes = 1 AND estado != 'Resuelto')                   AS strike1,
         SUM(num_strikes = 2 AND estado != 'Resuelto')                   AS strike2,
         SUM(num_strikes = 3 AND estado != 'Resuelto')                   AS strike3,
         SUM(num_strikes > 0  AND estado != 'Resuelto')                  AS con_alerta
       FROM reportes
       WHERE 1=1 ${filtroSuc} ${excluirPersonal}`,
      paramSuc
    );

    res.json(totales);
  } catch (error) {
    console.error('[GET /reportes/resumen]', error);
    res.status(500).json({ message: 'Error al obtener resumen.' });
  }
}