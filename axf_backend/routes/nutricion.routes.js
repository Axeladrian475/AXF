// ============================================================================
//  routes/nutricion.routes.js
//  Módulo de Nutrición — Ingredientes, Recetas, Registros Físicos, Dietas
// ============================================================================

import express from 'express';
import db from '../config/database.js';
import { verificarToken, soloPersonal, getSucursalId } from '../middlewares/auth.js';

const router = express.Router();

// ─── Middleware: solo nutriólogo o entrenador_nutriólogo ──────────────────────
function soloNutriologo(req, res, next) {
  const p = req.usuario.puesto;
  if (p !== 'nutriologo' && p !== 'entrenador_nutriologo') {
    return res.status(403).json({ message: 'Acceso exclusivo para Nutriólogos' });
  }
  next();
}

// getSucursalId importado desde middlewares/auth.js

// ════════════════════════════════════════════════════════════════════════════════
//  INGREDIENTES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/ingredientes
router.get('/ingredientes', verificarToken, soloPersonal, soloNutriologo, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_ingrediente, nombre, unidad_medicion
       FROM ingredientes
       ORDER BY nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/ingredientes]', err);
    res.status(500).json({ message: 'Error al obtener ingredientes' });
  }
});

// POST /api/nutricion/ingredientes
router.post('/ingredientes', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const { nombre, unidad_medicion } = req.body;
    if (!nombre || !unidad_medicion) {
      return res.status(400).json({ message: 'Nombre y unidad de medición son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO ingredientes (nombre, unidad_medicion, creado_por) VALUES (?, ?, ?)',
      [nombre.trim(), unidad_medicion, req.usuario.id]
    );

    res.status(201).json({
      message: 'Ingrediente creado',
      id_ingrediente: result.insertId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ya existe un ingrediente con ese nombre' });
    }
    console.error('[POST /nutricion/ingredientes]', err);
    res.status(500).json({ message: 'Error al crear ingrediente' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  RECETAS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/recetas
router.get('/recetas', verificarToken, soloPersonal, soloNutriologo, async (_req, res) => {
  try {
    const [recetas] = await db.query(
      `SELECT id_receta, nombre, imagen_url, proteinas_g, calorias, grasas_g, creado_en
       FROM recetas
       ORDER BY creado_en DESC`
    );

    // Cargar ingredientes de cada receta
    for (const r of recetas) {
      const [ings] = await db.query(
        `SELECT ri.cantidad, i.nombre, i.unidad_medicion
         FROM receta_ingredientes ri
         JOIN ingredientes i ON i.id_ingrediente = ri.id_ingrediente
         WHERE ri.id_receta = ?`,
        [r.id_receta]
      );
      r.ingredientes = ings;
    }

    res.json(recetas);
  } catch (err) {
    console.error('[GET /nutricion/recetas]', err);
    res.status(500).json({ message: 'Error al obtener recetas' });
  }
});

// POST /api/nutricion/recetas
// Body: { nombre, proteinas_g, calorias, grasas_g, ingredientes: [{ id_ingrediente, cantidad }] }
router.post('/recetas', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, proteinas_g, calorias, grasas_g, ingredientes } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: 'El nombre de la receta es obligatorio' });
    }

    const parsedIngs = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
    if (!Array.isArray(parsedIngs) || parsedIngs.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un ingrediente' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO recetas (nombre, proteinas_g, calorias, grasas_g, creado_por)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre.trim(), proteinas_g || null, calorias || null, grasas_g || null, req.usuario.id]
    );

    const id_receta = result.insertId;

    for (const ing of parsedIngs) {
      await conn.query(
        'INSERT INTO receta_ingredientes (id_receta, id_ingrediente, cantidad) VALUES (?, ?, ?)',
        [id_receta, ing.id_ingrediente, ing.cantidad]
      );
    }

    await conn.commit();

    res.status(201).json({ message: 'Receta creada', id_receta });
  } catch (err) {
    await conn.rollback();
    console.error('[POST /nutricion/recetas]', err);
    res.status(500).json({ message: 'Error al crear receta' });
  } finally {
    conn.release();
  }
});

// DELETE /api/nutricion/recetas/:id
router.delete('/recetas/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM recetas WHERE id_receta = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Receta no encontrada' });
    }
    res.json({ message: 'Receta eliminada' });
  } catch (err) {
    console.error('[DELETE /nutricion/recetas/:id]', err);
    res.status(500).json({ message: 'Error al eliminar receta' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  SUSCRIPTORES (para seleccionar paciente)
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/suscriptores
// Devuelve suscriptores activos de la misma sucursal con sesiones_nutriologo_restantes
router.get('/suscriptores', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const id_sucursal = getSucursalId(req.usuario);
    if (!id_sucursal) return res.status(400).json({ message: 'Sucursal no encontrada' });

    const [rows] = await db.query(
      `SELECT s.id_suscriptor, s.nombres, s.apellido_paterno, s.apellido_materno,
              s.fecha_nacimiento, s.sexo,
              COALESCE(SUM(sub.sesiones_nutriologo_restantes), 0) AS sesiones_nutriologo
       FROM suscriptores s
       LEFT JOIN suscripciones sub ON sub.id_suscriptor = s.id_suscriptor
         AND sub.estado = 'Activa'
         AND CURDATE() BETWEEN sub.fecha_inicio AND sub.fecha_fin
       WHERE s.id_sucursal_registro = ? AND s.activo = 1
       GROUP BY s.id_suscriptor
       ORDER BY s.nombres ASC`,
      [id_sucursal]
    );

    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/suscriptores]', err);
    res.status(500).json({ message: 'Error al obtener suscriptores' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  REGISTROS FÍSICOS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/registros/:id_suscriptor
router.get('/registros/:id_suscriptor', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rf.*, CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM registros_fisicos rf
       JOIN personal p ON p.id_personal = rf.id_nutriologo
       WHERE rf.id_suscriptor = ?
       ORDER BY rf.creado_en DESC`,
      [req.params.id_suscriptor]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/registros/:id]', err);
    res.status(500).json({ message: 'Error al obtener registros' });
  }
});

// POST /api/nutricion/registros
router.post('/registros', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const {
      id_suscriptor, peso_kg, altura_cm, edad,
      pct_grasa, pct_musculo, actividad, objetivo, notas,
      tmb, tdee,
      proteinas_min, proteinas_max,
      grasas_min, grasas_max,
      carbs_min, carbs_max,
    } = req.body;

    if (!id_suscriptor || !peso_kg || !altura_cm) {
      return res.status(400).json({ message: 'Suscriptor, peso y altura son obligatorios' });
    }

    const [result] = await db.query(
      `INSERT INTO registros_fisicos
        (id_suscriptor, id_nutriologo, peso_kg, altura_cm, edad,
         pct_grasa, pct_musculo, actividad, objetivo, notas,
         tmb, tdee, proteinas_min, proteinas_max,
         grasas_min, grasas_max, carbs_min, carbs_max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_suscriptor, req.usuario.id, peso_kg, altura_cm, edad || null,
        pct_grasa || null, pct_musculo || null, actividad || null, objetivo || null, notas || null,
        tmb || null, tdee || null, proteinas_min || null, proteinas_max || null,
        grasas_min || null, grasas_max || null, carbs_min || null, carbs_max || null,
      ]
    );

    res.status(201).json({ message: 'Registro guardado', id_registro: result.insertId });
  } catch (err) {
    console.error('[POST /nutricion/registros]', err);
    res.status(500).json({ message: 'Error al guardar registro' });
  }
});

// DELETE /api/nutricion/registros/:id
router.delete('/registros/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM registros_fisicos WHERE id_registro = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    console.error('[DELETE /nutricion/registros/:id]', err);
    res.status(500).json({ message: 'Error al eliminar registro' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  DIETAS
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/dietas/:id_suscriptor
router.get('/dietas/:id_suscriptor', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    // Obtener la última dieta
    const [[dieta]] = await db.query(
      `SELECT d.*, CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM dietas d
       JOIN personal p ON p.id_personal = d.id_nutriologo
       WHERE d.id_suscriptor = ?
       ORDER BY d.creado_en DESC LIMIT 1`,
      [req.params.id_suscriptor]
    );

    if (!dieta) return res.json(null);

    const [comidas] = await db.query(
      `SELECT dc.*, r.nombre AS receta_nombre
       FROM dieta_comidas dc
       LEFT JOIN recetas r ON r.id_receta = dc.id_receta
       WHERE dc.id_dieta = ?
       ORDER BY dc.dia, dc.orden_comida`,
      [dieta.id_dieta]
    );

    dieta.comidas = comidas;
    res.json(dieta);
  } catch (err) {
    console.error('[GET /nutricion/dietas/:id]', err);
    res.status(500).json({ message: 'Error al obtener dieta' });
  }
});

// POST /api/nutricion/dietas
// Body: { id_suscriptor, comidas: [{ dia, orden_comida, descripcion, id_receta?, calorias?, notas? }] }
router.post('/dietas', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id_suscriptor, comidas } = req.body;

    if (!id_suscriptor || !Array.isArray(comidas) || comidas.length === 0) {
      return res.status(400).json({ message: 'Suscriptor y comidas son obligatorios' });
    }

    // Verificar sesiones disponibles
    const [[sesion]] = await conn.query(
      `SELECT id_suscripcion, sesiones_nutriologo_restantes
       FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa'
         AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
         AND sesiones_nutriologo_restantes > 0
       ORDER BY fecha_fin ASC LIMIT 1`,
      [id_suscriptor]
    );

    if (!sesion) {
      return res.status(400).json({ message: 'El suscriptor no tiene sesiones de nutriólogo disponibles' });
    }

    await conn.beginTransaction();

    // Descontar sesión
    await conn.query(
      'UPDATE suscripciones SET sesiones_nutriologo_restantes = sesiones_nutriologo_restantes - 1 WHERE id_suscripcion = ?',
      [sesion.id_suscripcion]
    );

    // Crear dieta
    const [result] = await conn.query(
      'INSERT INTO dietas (id_suscriptor, id_nutriologo) VALUES (?, ?)',
      [id_suscriptor, req.usuario.id]
    );
    const id_dieta = result.insertId;

    // Insertar comidas
    for (const c of comidas) {
      await conn.query(
        `INSERT INTO dieta_comidas (id_dieta, dia, orden_comida, descripcion, id_receta, calorias, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_dieta, c.dia, c.orden_comida, c.descripcion || null, c.id_receta || null, c.calorias || null, c.notas || null]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Dieta creada y sesión descontada', id_dieta });
  } catch (err) {
    await conn.rollback();
    console.error('[POST /nutricion/dietas]', err);
    res.status(500).json({ message: 'Error al crear dieta' });
  } finally {
    conn.release();
  }
});

export default router;
