// ============================================================================
//  routes/nutricion.routes.js
//  Módulo de Nutrición — Ingredientes, Recetas, Registros Físicos, Dietas
//
//  CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
//  - Ingredientes ahora almacenan macros por unidad base
//    (kcal_base, proteinas_base, grasas_base, carbohidratos_base, cantidad_base)
//  - Recetas YA NO reciben macros manuales: se calculan automáticamente
//    sumando la contribución proporcional de cada ingrediente.
//  - Al editar un ingrediente, se recalculan todas las recetas que lo usan.
//  - La unidad de medida en la receta es la del ingrediente (no se duplica).
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

// ─── Helper: calcular macros totales de una receta ───────────────────────────
// ings: [{ id_ingrediente, cantidad }]
// Fórmula: macro = (macro_base / cantidad_base) * cantidad_usada
async function calcularMacrosReceta(conn, ings) {
  let calorias = 0, proteinas_g = 0, grasas_g = 0, carbohidratos_g = 0;

  for (const ing of ings) {
    const [[data]] = await conn.query(
      `SELECT cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base
       FROM ingredientes WHERE id_ingrediente = ?`,
      [ing.id_ingrediente]
    );
    if (!data || !Number(data.cantidad_base)) continue;

    const factor = Number(ing.cantidad) / Number(data.cantidad_base);
    calorias        += Number(data.kcal_base)          * factor;
    proteinas_g     += Number(data.proteinas_base)     * factor;
    grasas_g        += Number(data.grasas_base)        * factor;
    carbohidratos_g += Number(data.carbohidratos_base) * factor;
  }

  return {
    calorias:        Math.round(calorias        * 100) / 100,
    proteinas_g:     Math.round(proteinas_g     * 100) / 100,
    grasas_g:        Math.round(grasas_g        * 100) / 100,
    carbohidratos_g: Math.round(carbohidratos_g * 100) / 100,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  INGREDIENTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/ingredientes
router.get('/ingredientes', verificarToken, soloPersonal, soloNutriologo, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_ingrediente, nombre, unidad_medicion,
              cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base
       FROM ingredientes ORDER BY nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/ingredientes]', err);
    res.status(500).json({ message: 'Error al obtener ingredientes' });
  }
});

// POST /api/nutricion/ingredientes
// Body: { nombre, unidad_medicion, cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base }
router.post('/ingredientes', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const {
      nombre, unidad_medicion,
      cantidad_base      = 100,
      kcal_base          = 0,
      proteinas_base     = 0,
      grasas_base        = 0,
      carbohidratos_base = 0,
    } = req.body;

    if (!nombre?.trim() || !unidad_medicion) {
      return res.status(400).json({ message: 'Nombre y unidad de medición son obligatorios' });
    }
    if (Number(cantidad_base) <= 0) {
      return res.status(400).json({ message: 'La cantidad base debe ser mayor a 0' });
    }

    const [result] = await db.query(
      `INSERT INTO ingredientes
         (nombre, unidad_medicion, cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), unidad_medicion, cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base, req.usuario.id]
    );
    res.status(201).json({ message: 'Ingrediente creado', id_ingrediente: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un ingrediente con ese nombre' });
    console.error('[POST /nutricion/ingredientes]', err);
    res.status(500).json({ message: 'Error al crear ingrediente' });
  }
});

// PUT /api/nutricion/ingredientes/:id
// Actualiza macros y recalcula todas las recetas que usan este ingrediente.
router.put('/ingredientes/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, unidad_medicion, cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base } = req.body;

    if (!nombre?.trim() || !unidad_medicion) {
      return res.status(400).json({ message: 'Nombre y unidad de medición son obligatorios' });
    }
    if (Number(cantidad_base) <= 0) {
      return res.status(400).json({ message: 'La cantidad base debe ser mayor a 0' });
    }

    const [[ing]] = await conn.query('SELECT id_ingrediente FROM ingredientes WHERE id_ingrediente = ?', [req.params.id]);
    if (!ing) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    await conn.query(
      `UPDATE ingredientes
       SET nombre=?, unidad_medicion=?, cantidad_base=?, kcal_base=?, proteinas_base=?, grasas_base=?, carbohidratos_base=?
       WHERE id_ingrediente=?`,
      [nombre.trim(), unidad_medicion, cantidad_base, kcal_base, proteinas_base, grasas_base, carbohidratos_base, req.params.id]
    );

    // Recalcular macros de todas las recetas que contienen este ingrediente
    const [afectadas] = await conn.query(
      'SELECT DISTINCT id_receta FROM receta_ingredientes WHERE id_ingrediente = ?', [req.params.id]
    );
    for (const { id_receta } of afectadas) {
      const [ings] = await conn.query(
        'SELECT id_ingrediente, cantidad FROM receta_ingredientes WHERE id_receta = ?', [id_receta]
      );
      const macros = await calcularMacrosReceta(conn, ings);
      await conn.query(
        'UPDATE recetas SET calorias=?, proteinas_g=?, grasas_g=?, carbohidratos_g=? WHERE id_receta=?',
        [macros.calorias, macros.proteinas_g, macros.grasas_g, macros.carbohidratos_g, id_receta]
      );
    }

    res.json({ message: 'Ingrediente actualizado', recetas_recalculadas: afectadas.length });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un ingrediente con ese nombre' });
    console.error('[PUT /nutricion/ingredientes/:id]', err);
    res.status(500).json({ message: 'Error al actualizar ingrediente' });
  } finally {
    conn.release();
  }
});

// DELETE /api/nutricion/ingredientes/:id
router.delete('/ingredientes/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [[ing]] = await conn.query('SELECT id_ingrediente FROM ingredientes WHERE id_ingrediente = ?', [req.params.id]);
    if (!ing) { conn.release(); return res.status(404).json({ message: 'Ingrediente no encontrado' }); }

    await conn.beginTransaction();
    await conn.query('DELETE FROM receta_ingredientes WHERE id_ingrediente = ?', [req.params.id]);
    await conn.query('DELETE FROM ingredientes WHERE id_ingrediente = ?', [req.params.id]);
    await conn.commit();
    res.json({ message: 'Ingrediente eliminado' });
  } catch (err) {
    await conn.rollback();
    console.error('[DELETE /nutricion/ingredientes/:id]', err);
    res.status(500).json({ message: 'Error al eliminar ingrediente' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  RECETAS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/nutricion/recetas
router.get('/recetas', verificarToken, soloPersonal, soloNutriologo, async (_req, res) => {
  try {
    const [recetas] = await db.query(
      `SELECT id_receta, nombre, imagen_url, calorias, proteinas_g, grasas_g, carbohidratos_g, creado_en
       FROM recetas ORDER BY creado_en DESC`
    );
    for (const r of recetas) {
      const [ings] = await db.query(
        `SELECT ri.id_ingrediente, ri.cantidad,
                i.nombre, i.unidad_medicion, i.cantidad_base,
                i.kcal_base, i.proteinas_base, i.grasas_base, i.carbohidratos_base
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
// Macros calculados automáticamente — NO se aceptan en el body.
// Body: { nombre, ingredientes: [{ id_ingrediente, cantidad }] }
router.post('/recetas', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, ingredientes } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre de la receta es obligatorio' });

    const parsedIngs = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
    if (!Array.isArray(parsedIngs) || parsedIngs.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un ingrediente' });
    }

    const macros = await calcularMacrosReceta(conn, parsedIngs);

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO recetas (nombre, calorias, proteinas_g, grasas_g, carbohidratos_g, creado_por) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), macros.calorias, macros.proteinas_g, macros.grasas_g, macros.carbohidratos_g, req.usuario.id]
    );
    for (const ing of parsedIngs) {
      await conn.query(
        'INSERT INTO receta_ingredientes (id_receta, id_ingrediente, cantidad) VALUES (?, ?, ?)',
        [result.insertId, ing.id_ingrediente, ing.cantidad]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Receta creada', id_receta: result.insertId, macros });
  } catch (err) {
    await conn.rollback();
    console.error('[POST /nutricion/recetas]', err);
    res.status(500).json({ message: 'Error al crear receta' });
  } finally {
    conn.release();
  }
});

// PUT /api/nutricion/recetas/:id
// Body: { nombre, ingredientes: [{ id_ingrediente, cantidad }] }
router.put('/recetas/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, ingredientes } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre de la receta es obligatorio' });

    const parsedIngs = typeof ingredientes === 'string' ? JSON.parse(ingredientes) : ingredientes;
    if (!Array.isArray(parsedIngs) || parsedIngs.length === 0) {
      return res.status(400).json({ message: 'Se requiere al menos un ingrediente' });
    }

    const [[existe]] = await conn.query('SELECT id_receta FROM recetas WHERE id_receta = ?', [req.params.id]);
    if (!existe) return res.status(404).json({ message: 'Receta no encontrada' });

    const macros = await calcularMacrosReceta(conn, parsedIngs);

    await conn.beginTransaction();
    await conn.query(
      'UPDATE recetas SET nombre=?, calorias=?, proteinas_g=?, grasas_g=?, carbohidratos_g=? WHERE id_receta=?',
      [nombre.trim(), macros.calorias, macros.proteinas_g, macros.grasas_g, macros.carbohidratos_g, req.params.id]
    );
    await conn.query('DELETE FROM receta_ingredientes WHERE id_receta = ?', [req.params.id]);
    for (const ing of parsedIngs) {
      await conn.query(
        'INSERT INTO receta_ingredientes (id_receta, id_ingrediente, cantidad) VALUES (?, ?, ?)',
        [req.params.id, ing.id_ingrediente, ing.cantidad]
      );
    }
    await conn.commit();
    res.json({ message: 'Receta actualizada', macros });
  } catch (err) {
    await conn.rollback();
    console.error('[PUT /nutricion/recetas/:id]', err);
    res.status(500).json({ message: 'Error al actualizar receta' });
  } finally {
    conn.release();
  }
});

// DELETE /api/nutricion/recetas/:id
router.delete('/recetas/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM recetas WHERE id_receta = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Receta no encontrada' });
    res.json({ message: 'Receta eliminada' });
  } catch (err) {
    console.error('[DELETE /nutricion/recetas/:id]', err);
    res.status(500).json({ message: 'Error al eliminar receta' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  SUSCRIPTORES
// ════════════════════════════════════════════════════════════════════════════

router.get('/suscriptores', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const id_sucursal = getSucursalId(req.usuario);
    if (!id_sucursal) return res.status(400).json({ message: 'Sucursal no encontrada' });
    const [rows] = await db.query(
      `SELECT s.id_suscriptor, s.nombres, s.apellido_paterno, s.apellido_materno,
              s.fecha_nacimiento, s.sexo,
              COALESCE(SUM(sub.sesiones_nutriologo_restantes), 0) AS sesiones_nutriologo
       FROM suscriptores s
       LEFT JOIN suscripciones sub ON sub.id_suscriptor = s.id_suscriptor AND sub.estado = 'Activa'
       WHERE s.id_sucursal_registro = ? AND s.activo = 1
         AND EXISTS (SELECT 1 FROM suscripciones
                     WHERE id_suscriptor = s.id_suscriptor AND estado = 'Activa' AND CURDATE() <= fecha_fin)
       GROUP BY s.id_suscriptor ORDER BY s.nombres ASC`,
      [id_sucursal]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/suscriptores]', err);
    res.status(500).json({ message: 'Error al obtener suscriptores' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  REGISTROS FÍSICOS
// ════════════════════════════════════════════════════════════════════════════

router.get('/registros/:id_suscriptor', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rf.*, CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM registros_fisicos rf
       JOIN personal p ON p.id_personal = rf.id_nutriologo
       WHERE rf.id_suscriptor = ? ORDER BY rf.creado_en DESC`,
      [req.params.id_suscriptor]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /nutricion/registros/:id]', err);
    res.status(500).json({ message: 'Error al obtener registros' });
  }
});

router.post('/registros', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const {
      id_suscriptor, peso_kg, altura_cm, edad,
      pct_grasa, pct_musculo, actividad, objetivo, notas,
      tmb, tdee, proteinas_min, proteinas_max, grasas_min, grasas_max, carbs_min, carbs_max,
    } = req.body;
    if (!id_suscriptor || !peso_kg || !altura_cm) {
      return res.status(400).json({ message: 'Suscriptor, peso y altura son obligatorios' });
    }
    const [result] = await db.query(
      `INSERT INTO registros_fisicos
        (id_suscriptor, id_nutriologo, peso_kg, altura_cm, edad,
         pct_grasa, pct_musculo, actividad, objetivo, notas,
         tmb, tdee, proteinas_min, proteinas_max, grasas_min, grasas_max, carbs_min, carbs_max)
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

router.delete('/registros/:id', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM registros_fisicos WHERE id_registro = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (err) {
    console.error('[DELETE /nutricion/registros/:id]', err);
    res.status(500).json({ message: 'Error al eliminar registro' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  DIETAS
// ════════════════════════════════════════════════════════════════════════════

router.get('/dietas/:id_suscriptor', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  try {
    const [[dieta]] = await db.query(
      `SELECT d.*, CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
       FROM dietas d JOIN personal p ON p.id_personal = d.id_nutriologo
       WHERE d.id_suscriptor = ? ORDER BY d.creado_en DESC LIMIT 1`,
      [req.params.id_suscriptor]
    );
    if (!dieta) return res.json(null);

    const [comidas] = await db.query(
      `SELECT dc.*, r.nombre AS receta_nombre,
              r.calorias AS receta_calorias, r.proteinas_g AS receta_proteinas,
              r.grasas_g AS receta_grasas,   r.carbohidratos_g AS receta_carbohidratos
       FROM dieta_comidas dc
       LEFT JOIN recetas r ON r.id_receta = dc.id_receta
       WHERE dc.id_dieta = ? ORDER BY dc.dia, dc.orden_comida`,
      [dieta.id_dieta]
    );
    dieta.comidas = comidas;
    res.json(dieta);
  } catch (err) {
    console.error('[GET /nutricion/dietas/:id]', err);
    res.status(500).json({ message: 'Error al obtener dieta' });
  }
});

router.post('/dietas', verificarToken, soloPersonal, soloNutriologo, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id_suscriptor, comidas } = req.body;
    if (!id_suscriptor || !Array.isArray(comidas) || comidas.length === 0) {
      return res.status(400).json({ message: 'Suscriptor y comidas son obligatorios' });
    }

    const [[activa]] = await conn.query(
      `SELECT id_suscripcion FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND CURDATE() <= fecha_fin LIMIT 1`,
      [id_suscriptor]
    );
    if (!activa) return res.status(403).json({ message: 'El suscriptor no tiene una membresía activa vigente' });

    const [[sesion]] = await conn.query(
      `SELECT id_suscripcion FROM suscripciones
       WHERE id_suscriptor = ? AND estado = 'Activa' AND sesiones_nutriologo_restantes > 0
       ORDER BY id_suscripcion ASC LIMIT 1`,
      [id_suscriptor]
    );
    if (!sesion) return res.status(400).json({ message: 'El suscriptor no tiene sesiones de nutriólogo disponibles' });

    await conn.beginTransaction();
    await conn.query(
      'UPDATE suscripciones SET sesiones_nutriologo_restantes = sesiones_nutriologo_restantes - 1 WHERE id_suscripcion = ?',
      [sesion.id_suscripcion]
    );
    const [result] = await conn.query(
      'INSERT INTO dietas (id_suscriptor, id_nutriologo) VALUES (?, ?)',
      [id_suscriptor, req.usuario.id]
    );
    for (const c of comidas) {
      await conn.query(
        `INSERT INTO dieta_comidas (id_dieta, dia, orden_comida, descripcion, id_receta, calorias, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, c.dia, c.orden_comida, c.descripcion || null, c.id_receta || null, c.calorias || null, c.notas || null]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Dieta creada y sesión descontada', id_dieta: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('[POST /nutricion/dietas]', err);
    res.status(500).json({ message: 'Error al crear dieta' });
  } finally {
    conn.release();
  }
});

export default router;