import express from 'express';
import jwt     from 'jsonwebtoken';
import db      from '../config/database.js';

const router = express.Router();

// ─── Middleware: verificar token JWT ─────────────────────────────────────────
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ─── Middleware: solo sucursal o maestro ─────────────────────────────────────
function soloSucursalOMaestro(req, res, next) {
  if (req.usuario.rol !== 'sucursal' && req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }
  next();
}

// ─── Helper: construir condición WHERE según destinatarios ───────────────────
//
// La tabla personal tiene estos puestos posibles:
//   'staff' | 'entrenador' | 'nutriologo' | 'entrenador_nutriologo'
//
// Reglas de inclusión:
//   checkbox "staff"        → puesto = 'staff'
//   checkbox "entrenadores" → puesto = 'entrenador' O 'entrenador_nutriologo'
//   checkbox "nutriologos"  → puesto = 'nutriologo' O 'entrenador_nutriologo'
//   checkbox "todos"        → sin filtro de puesto (todos los activos)
//
// Se construye como condiciones OR para que mysql pueda usar índices correctamente.
function construirFiltroDestinatarios(destinatarios) {
  // Si viene "todos", no hay filtro de puesto
  if (destinatarios.includes('todos')) return null;

  const condiciones = [];

  if (destinatarios.includes('staff')) {
    condiciones.push(`puesto = 'staff'`);
  }
  if (destinatarios.includes('entrenadores')) {
    // Incluye entrenadores puros Y los que son entrenador+nutriólogo
    condiciones.push(`puesto = 'entrenador'`);
    condiciones.push(`puesto = 'entrenador_nutriologo'`);
  }
  if (destinatarios.includes('nutriologos')) {
    // Incluye nutriólogos puros Y los que son entrenador+nutriólogo
    condiciones.push(`puesto = 'nutriologo'`);
    // Solo agregar si no fue agregado ya por 'entrenadores'
    if (!destinatarios.includes('entrenadores')) {
      condiciones.push(`puesto = 'entrenador_nutriologo'`);
    }
  }

  if (condiciones.length === 0) return null;

  // Eliminar duplicados y unir con OR
  return [...new Set(condiciones)].join(' OR ');
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/avisos
// 1. Valida el body
// 2. Busca el personal activo de la sucursal según destinatarios
// 3. Inserta en `avisos` (1 fila)
// 4. Inserta en `aviso_destinatarios` (1 fila por persona encontrada)
//
// Body: { mensaje: string, destinatarios: string[] }
// Ej:  { mensaje: "Reunión mañana", destinatarios: ["staff","entrenadores"] }
// ────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id_sucursal = req.usuario.id;
    const { mensaje, destinatarios } = req.body;

    // ── Validaciones ─────────────────────────────────────────────────────────
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
    }
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ message: 'Selecciona al menos un grupo de destinatarios.' });
    }
    const opcionesValidas = ['todos', 'staff', 'entrenadores', 'nutriologos'];
    const invalidas = destinatarios.filter(d => !opcionesValidas.includes(d));
    if (invalidas.length > 0) {
      return res.status(400).json({ message: `Destinatarios inválidos: ${invalidas.join(', ')}` });
    }

    // ── Construir y ejecutar query de personal ────────────────────────────────
    const filtroPuesto = construirFiltroDestinatarios(destinatarios);
    let personal;

    if (!filtroPuesto) {
      // "Todos" — sin filtro de puesto
      [personal] = await db.query(
        `SELECT id_personal, nombres, puesto
         FROM personal
         WHERE id_sucursal = ? AND activo = 1`,
        [id_sucursal]
      );
    } else {
      // Filtro específico por puestos
      [personal] = await db.query(
        `SELECT id_personal, nombres, puesto
         FROM personal
         WHERE id_sucursal = ? AND activo = 1 AND (${filtroPuesto})`,
        [id_sucursal]
      );
    }

    if (personal.length === 0) {
      return res.status(404).json({
        message: 'No hay personal activo registrado para los destinatarios seleccionados.',
      });
    }

    // ── Transacción: insertar en avisos + aviso_destinatarios ─────────────────
    await conn.beginTransaction();

    // 1. Crear el aviso en `avisos`
    const [avisoResult] = await conn.query(
      `INSERT INTO avisos (id_sucursal, mensaje) VALUES (?, ?)`,
      [id_sucursal, mensaje.trim()]
    );
    const id_aviso = avisoResult.insertId;

    // 2. Insertar en `aviso_destinatarios` — un registro por persona
    //    Placeholders explícitos: compatible con mysql2/promise en ES modules
    const placeholders = personal.map(() => '(?, ?)').join(', ');
    const valores      = personal.flatMap(p => [id_aviso, p.id_personal]);
    await conn.query(
      `INSERT INTO aviso_destinatarios (id_aviso, id_personal) VALUES ${placeholders}`,
      valores
    );

    await conn.commit();

    res.status(201).json({
      message: `Aviso enviado correctamente a ${personal.length} miembro(s) del personal.`,
      id_aviso,
      total_destinatarios: personal.length,
    });

  } catch (error) {
    await conn.rollback();
    console.error('[POST /avisos]', error);
    res.status(500).json({ message: 'Error al enviar el aviso.' });
  } finally {
    conn.release();
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/avisos
// Últimos 20 avisos de la sucursal con conteo de lecturas.
// ────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;

    const [avisos] = await db.query(
      `SELECT
         a.id_aviso,
         a.mensaje,
         a.creado_en,
         COUNT(ad.id)                     AS total_destinatarios,
         SUM(ad.leido)                    AS total_leidos,
         COUNT(ad.id) - SUM(ad.leido)     AS total_pendientes
       FROM avisos a
       LEFT JOIN aviso_destinatarios ad ON ad.id_aviso = a.id_aviso
       WHERE a.id_sucursal = ?
       GROUP BY a.id_aviso
       ORDER BY a.creado_en DESC
       LIMIT 20`,
      [id_sucursal]
    );

    res.json(avisos);
  } catch (error) {
    console.error('[GET /avisos]', error);
    res.status(500).json({ message: 'Error al obtener los avisos.' });
  }
});

export default router;