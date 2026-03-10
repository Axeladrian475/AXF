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

// ─── Helper: convierte tipo + valor → días totales ───────────────────────────
function calcularFrecuenciaDias(frecuencia_tipo, valor) {
  const n = parseInt(valor, 10);
  if (!n || n <= 0) return null;
  switch (frecuencia_tipo) {
    case 'dias':    return n;
    case 'semanas': return n * 7;
    case 'meses':   return n * 30;
    default:        return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/incidencias/config
// Devuelve la configuración guardada de la sucursal (para pre-llenar el form)
// ────────────────────────────────────────────────────────────────────────────
router.get('/config', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;

    const [[config]] = await db.query(
      `SELECT id_config, frecuencia_dias, frecuencia_tipo, valor,
              ultimo_envio, proximo_envio
       FROM config_reportes_periodicos
       WHERE id_sucursal = ?`,
      [id_sucursal]
    );

    res.json(config ?? null);
  } catch (error) {
    console.error('[GET /incidencias/config]', error);
    res.status(500).json({ message: 'Error al obtener la configuración' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/incidencias/config
// Guarda o actualiza la configuración de frecuencia de reportes.
//
// Body: { frecuencia_tipo: "dias"|"semanas"|"meses", valor: 3 }
// ────────────────────────────────────────────────────────────────────────────
router.post('/config', verificarToken, soloSucursalOMaestro, async (req, res) => {
  try {
    const id_sucursal = req.usuario.id;
    const { frecuencia_tipo, valor } = req.body;

    // ── Validaciones ─────────────────────────────────────────────────────────
    if (!frecuencia_tipo || !['dias', 'semanas', 'meses'].includes(frecuencia_tipo)) {
      return res.status(400).json({ message: 'Frecuencia inválida. Usa: dias, semanas o meses.' });
    }

    const frecuencia_dias = calcularFrecuenciaDias(frecuencia_tipo, valor);
    if (!frecuencia_dias) {
      return res.status(400).json({ message: 'El valor debe ser un número entero mayor a 0.' });
    }

    // ── Calcular próximo envío ────────────────────────────────────────────────
    const ahora      = new Date();
    const proximo    = new Date(ahora.getTime() + frecuencia_dias * 24 * 60 * 60 * 1000);
    const ahoraSQL   = ahora.toISOString().slice(0, 19).replace('T', ' ');
    const proximoSQL = proximo.toISOString().slice(0, 19).replace('T', ' ');

    // ── INSERT o UPDATE si ya existe (uq_config_sucursal garantiza unicidad) ─
    await db.query(
      `INSERT INTO config_reportes_periodicos
         (id_sucursal, frecuencia_dias, frecuencia_tipo, valor, ultimo_envio, proximo_envio)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         frecuencia_dias = VALUES(frecuencia_dias),
         frecuencia_tipo = VALUES(frecuencia_tipo),
         valor           = VALUES(valor),
         ultimo_envio    = VALUES(ultimo_envio),
         proximo_envio   = VALUES(proximo_envio)`,
      [id_sucursal, frecuencia_dias, frecuencia_tipo, parseInt(valor, 10), ahoraSQL, proximoSQL]
    );

    // ── Etiqueta legible para el mensaje de confirmación ─────────────────────
    const etiquetas = { dias: 'día(s)', semanas: 'semana(s)', meses: 'mes(es)' };

    res.status(200).json({
      message: `Configuración guardada. Recibirás reportes cada ${parseInt(valor, 10)} ${etiquetas[frecuencia_tipo]}.`,
      config: {
        frecuencia_dias,
        frecuencia_tipo,
        valor:         parseInt(valor, 10),
        ultimo_envio:  ahoraSQL,
        proximo_envio: proximoSQL,
      },
    });
  } catch (error) {
    console.error('[POST /incidencias/config]', error);
    res.status(500).json({ message: 'Error al guardar la configuración.' });
  }
});

export default router;