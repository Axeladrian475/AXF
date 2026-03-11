// ============================================================================
//  routes/dashboard.routes.js
//
//  Endpoints del Dashboard del Personal (staff / entrenador / nutriologo / entrenador_nutriologo)
//
//  GET  /api/dashboard/stats          → Suscriptores activos e inactivos de la sucursal
//  GET  /api/dashboard/accesos?fecha= → Historial de accesos por fecha (YYYY-MM-DD)
// ============================================================================

import express from 'express';
import { verificarToken, personalOSucursal } from '../middlewares/auth.js';
import db from '../config/database.js';

const router = express.Router();

// ─── Helper: obtener id_sucursal del token ────────────────────────────────────
// JWT personal: { id: id_personal, rol: 'personal', puesto }
// JWT sucursal: { id: id_sucursal, rol: 'sucursal' }
async function obtenerIdSucursal(usuario) {
  if (usuario.rol === 'sucursal') return usuario.id;

  if (usuario.rol === 'personal') {
    // Consultar la sucursal asignada al empleado
    const [[personal]] = await db.query(
      `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
      [usuario.id]
    );
    return personal?.id_sucursal ?? null;
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/stats
// Devuelve el total de suscriptores activos e inactivos de la sucursal.
//
// "Activo" = tiene al menos una suscripción con fecha_fin >= HOY
// "Inactivo" = suscriptor registrado en la sucursal sin suscripción activa
//
// Accesible por: personal y sucursal
// ════════════════════════════════════════════════════════════════════════════
router.get('/stats', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const id_sucursal = await obtenerIdSucursal(req.usuario);
    if (!id_sucursal) {
      return res.status(400).json({ message: 'No se pudo determinar la sucursal.' });
    }

    // Subconsulta: suscriptores con suscripción activa en esta fecha
    const [[resultado]] = await db.query(
      `SELECT
         COUNT(DISTINCT s.id_suscriptor)                                   AS total_suscriptores,
         COUNT(DISTINCT CASE
           WHEN sus.id_suscripcion IS NOT NULL THEN s.id_suscriptor
         END)                                                               AS activos,
         COUNT(DISTINCT CASE
           WHEN sus.id_suscripcion IS NULL THEN s.id_suscriptor
         END)                                                               AS inactivos
       FROM suscriptores s
       LEFT JOIN (
         SELECT DISTINCT id_suscriptor, id_suscripcion
         FROM suscripciones_suscriptores
         WHERE fecha_fin >= CURDATE() AND activa = 1
       ) sus ON sus.id_suscriptor = s.id_suscriptor
       WHERE s.id_sucursal_registro = ? AND s.activo = 1`,
      [id_sucursal]
    );

    res.json({
      activos:            resultado.activos   ?? 0,
      inactivos:          resultado.inactivos ?? 0,
      total_suscriptores: resultado.total_suscriptores ?? 0,
    });
  } catch (error) {
    console.error('[GET /dashboard/stats]', error);
    res.status(500).json({ message: 'Error al obtener estadísticas.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/accesos?fecha=YYYY-MM-DD
// Historial de accesos de la sucursal en una fecha específica.
//
// Respuesta por fila:
//   { suscriptor, dia, fecha, hora, metodo, resultado }
//
// Solo se devuelven accesos con resultado = 'Permitido'
// Accesible por: personal y sucursal
// ════════════════════════════════════════════════════════════════════════════
router.get('/accesos', verificarToken, personalOSucursal, async (req, res) => {
  try {
    const { fecha } = req.query;

    // Validar formato de fecha
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ message: 'Parámetro "fecha" requerido en formato YYYY-MM-DD.' });
    }

    const id_sucursal = await obtenerIdSucursal(req.usuario);
    if (!id_sucursal) {
      return res.status(400).json({ message: 'No se pudo determinar la sucursal.' });
    }

    const [accesos] = await db.query(
      `SELECT
         CONCAT(s.nombres, ' ', s.apellido_paterno,
           IFNULL(CONCAT(' ', s.apellido_materno), ''))       AS suscriptor,
         s.id_suscriptor,
         -- Día de la semana en español
         ELT(DAYOFWEEK(a.fecha_hora),
           'Domingo','Lunes','Martes','Miércoles',
           'Jueves','Viernes','Sábado')                       AS dia,
         DATE_FORMAT(a.fecha_hora, '%d/%m/%Y')                AS fecha,
         DATE_FORMAT(a.fecha_hora, '%h:%i %p')                AS hora,
         a.metodo,
         a.resultado
       FROM accesos a
       INNER JOIN suscriptores s ON s.id_suscriptor = a.id_suscriptor
       WHERE a.id_sucursal = ?
         AND DATE(a.fecha_hora) = ?
         AND a.resultado = 'Permitido'
       ORDER BY a.fecha_hora ASC`,
      [id_sucursal, fecha]
    );

    res.json(accesos);
  } catch (error) {
    console.error('[GET /dashboard/accesos]', error);
    res.status(500).json({ message: 'Error al obtener el historial de accesos.' });
  }
});

export default router;