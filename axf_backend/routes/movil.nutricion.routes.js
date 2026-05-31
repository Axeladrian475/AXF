// ============================================================================
//  routes/movil.nutricion.routes.js
//  Endpoints de nutrición para la app móvil (suscriptores)
//
//  Rutas registradas en index.js como:
//    app.use('/api/movil/nutricion', movilNutricionRoutes);
//
//  GET /api/movil/nutricion/dietas              → Lista de todas las dietas
//  GET /api/movil/nutricion/dietas/:id          → Detalle agrupado por días
//  GET /api/movil/nutricion/dietas/:id/pdf      → PDF descargable (token en query param)
// ============================================================================

import express from 'express';
import jwt     from 'jsonwebtoken';
import db      from '../config/database.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { requiereSuscripcionActiva } from '../middlewares/auth.js';

// Fuentes empaquetadas dentro del proyecto → funcionan en Windows, Linux y Mac.
// Copia los dos .ttf en la carpeta  axf_backend/fonts/
const __filename2  = fileURLToPath(import.meta.url);
const __dirname2   = path.dirname(__filename2);
const FONT_REGULAR = path.join(__dirname2, '..', 'fonts', 'DejaVuSans.ttf');
const FONT_BOLD    = path.join(__dirname2, '..', 'fonts', 'DejaVuSans-Bold.ttf');

const router = express.Router();

// ── Middleware: verifica header Authorization Bearer ─────────────────────────
function verificarSuscriptor(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.rol !== 'suscriptor') {
      return res.status(403).json({ message: 'Acceso exclusivo para suscriptores' });
    }
    req.usuario = payload;
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
}

// ── Middleware: verifica token desde query param ?token=... (para URLs en navegador) ──
function verificarSuscriptorQuery(req, res, next) {
  const token = req.query.token;
  if (!token) return res.status(401).send('Token requerido');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.rol !== 'suscriptor') {
      return res.status(403).send('Acceso exclusivo para suscriptores');
    }
    req.usuario = payload;
    next();
  } catch {
    return res.status(403).send('Token inválido o expirado');
  }
}

const DIAS = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

// ── Helper: carga dieta completa desde BD ────────────────────────────────────
async function cargarDietaDetalle(id_dieta, id_suscriptor) {
  const [[dieta]] = await db.query(
    `SELECT d.id_dieta, d.creado_en,
            CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo
     FROM dietas d
     JOIN personal p ON p.id_personal = d.id_nutriologo
     WHERE d.id_dieta = ? AND d.id_suscriptor = ?`,
    [id_dieta, id_suscriptor]
  );
  if (!dieta) return null;

  const [comidas] = await db.query(
    `SELECT dc.id_comida, dc.dia, dc.orden_comida, dc.descripcion,
            dc.calorias, dc.notas, dc.id_receta,
            r.nombre AS receta_nombre, r.imagen_url AS receta_imagen,
            r.proteinas_g, r.grasas_g
     FROM dieta_comidas dc
     LEFT JOIN recetas r ON r.id_receta = dc.id_receta
     WHERE dc.id_dieta = ?
     ORDER BY dc.dia ASC, dc.orden_comida ASC`,
    [id_dieta]
  );

  const recetaIds = [...new Set(comidas.filter(c => c.id_receta).map(c => c.id_receta))];
  const ingsPorReceta = {};
  if (recetaIds.length > 0) {
    const ph = recetaIds.map(() => '?').join(',');
    const [ings] = await db.query(
      `SELECT ri.id_receta, i.nombre, ri.cantidad, i.unidad_medicion
       FROM receta_ingredientes ri
       JOIN ingredientes i ON i.id_ingrediente = ri.id_ingrediente
       WHERE ri.id_receta IN (${ph})`,
      recetaIds
    );
    for (const ing of ings) {
      if (!ingsPorReceta[ing.id_receta]) ingsPorReceta[ing.id_receta] = [];
      ingsPorReceta[ing.id_receta].push({
        nombre: ing.nombre,
        cantidad: parseFloat(ing.cantidad),
        unidad_medicion: ing.unidad_medicion,
      });
    }
  }

  const comidasConIngs = comidas.map(c => ({
    id_comida:     c.id_comida,
    dia:           c.dia,
    orden_comida:  c.orden_comida,
    descripcion:   c.descripcion,
    calorias:      c.calorias   !== null ? parseFloat(c.calorias)   : null,
    notas:         c.notas,
    id_receta:     c.id_receta,
    receta_nombre: c.receta_nombre,
    receta_imagen: c.receta_imagen,
    proteinas_g:   c.proteinas_g !== null ? parseFloat(c.proteinas_g) : null,
    grasas_g:      c.grasas_g   !== null ? parseFloat(c.grasas_g)   : null,
    ingredientes:  c.id_receta ? (ingsPorReceta[c.id_receta] || []) : [],
  }));

  const diasMap = {};
  for (const comida of comidasConIngs) {
    const nombreDia = DIAS[comida.dia] || `Día ${comida.dia}`;
    if (!diasMap[comida.dia]) diasMap[comida.dia] = { dia: nombreDia, comidas: [] };
    diasMap[comida.dia].comidas.push(comida);
  }
  const dias = Object.keys(diasMap).sort((a, b) => Number(a) - Number(b)).map(k => diasMap[k]);

  return { ...dieta, dias, comidas: comidasConIngs };
}

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/movil/nutricion/dietas
// ════════════════════════════════════════════════════════════════════════════
router.get('/dietas', verificarSuscriptor, requiereSuscripcionActiva, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const [dietas] = await db.query(
      `SELECT d.id_dieta, d.creado_en,
              CONCAT(p.nombres, ' ', p.apellido_paterno) AS nutriologo,
              COUNT(dc.id_comida) AS total_comidas
       FROM dietas d
       JOIN personal p ON p.id_personal = d.id_nutriologo
       LEFT JOIN dieta_comidas dc ON dc.id_dieta = d.id_dieta
       WHERE d.id_suscriptor = ?
       GROUP BY d.id_dieta, d.creado_en, nutriologo
       ORDER BY d.creado_en DESC`,
      [id_suscriptor]
    );
    res.json(dietas);
  } catch (err) {
    console.error('[GET /movil/nutricion/dietas]', err);
    res.status(500).json({ message: 'Error al obtener dietas' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/movil/nutricion/dietas/:id
// ════════════════════════════════════════════════════════════════════════════
router.get('/dietas/:id', verificarSuscriptor, requiereSuscripcionActiva, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_dieta      = parseInt(req.params.id, 10);
    if (isNaN(id_dieta)) return res.status(400).json({ message: 'ID de dieta inválido' });

    const dieta = await cargarDietaDetalle(id_dieta, id_suscriptor);
    if (!dieta) return res.status(404).json({ message: 'Dieta no encontrada' });

    res.json(dieta);
  } catch (err) {
    console.error('[GET /movil/nutricion/dietas/:id]', err);
    res.status(500).json({ message: 'Error al obtener detalle de dieta' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/movil/nutricion/dietas/:id/pdf?token=<jwt>
//  Se abre directamente en el navegador del dispositivo, por eso el token
//  va en la query string en lugar del header Authorization.
// ════════════════════════════════════════════════════════════════════════════
router.get('/dietas/:id/pdf', verificarSuscriptorQuery, requiereSuscripcionActiva, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_dieta      = parseInt(req.params.id, 10);
    if (isNaN(id_dieta)) return res.status(400).send('ID de dieta inválido');

    const dieta = await cargarDietaDetalle(id_dieta, id_suscriptor);
    if (!dieta) return res.status(404).send('Dieta no encontrada');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Registrar fuentes con soporte UTF-8 (tildes, ñ, etc.)
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold',    FONT_BOLD);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="dieta_${id_dieta}.pdf"`);
    doc.pipe(res);

    const COLOR_TITULO = '#1A2E45';
    const COLOR_DIA    = '#E87722';
    const COLOR_TEXTO  = '#333333';
    const COLOR_GRIS   = '#666666';

    // Encabezado
    doc.font('Bold').fontSize(22).fillColor(COLOR_TITULO).text('Plan Nutricional', { align: 'center' });
    doc.font('Regular').fontSize(11).fillColor(COLOR_GRIS)
       .text(`#${dieta.id_dieta}  ·  Nutriólogo: ${dieta.nutriologo}`, { align: 'center' });

    const fechaStr = new Date(dieta.creado_en).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.text(`Fecha: ${fechaStr}`, { align: 'center' });
    doc.moveDown(1.5);

    // Días y comidas
    for (const dia of dieta.dias) {
      doc.font('Bold').fontSize(13).fillColor(COLOR_DIA).text(dia.dia);
      doc.moveDown(0.3);

      for (const comida of dia.comidas) {
        const titulo = `${comida.orden_comida}. ${comida.descripcion || comida.receta_nombre || 'Comida'}`;
        doc.font('Bold').fontSize(11).fillColor(COLOR_TITULO).text(titulo);

        if (comida.receta_nombre && comida.receta_nombre !== comida.descripcion) {
          doc.font('Regular').fontSize(10).fillColor(COLOR_GRIS).text(`   Receta: ${comida.receta_nombre}`);
        }

        const macros = [];
        if (comida.calorias)    macros.push(`${Math.round(comida.calorias)} kcal`);
        if (comida.proteinas_g) macros.push(`${Math.round(comida.proteinas_g)}g proteina`);
        if (comida.grasas_g)    macros.push(`${Math.round(comida.grasas_g)}g grasas`);
        if (macros.length > 0) {
          doc.font('Regular').fontSize(10).fillColor(COLOR_GRIS).text(`   ${macros.join('  -  ')}`);
        }

        if (comida.ingredientes && comida.ingredientes.length > 0) {
          const ingsStr = comida.ingredientes
            .map(i => `${i.nombre} ${i.cantidad} ${i.unidad_medicion}`)
            .join(', ');
          doc.font('Regular').fontSize(10).fillColor(COLOR_TEXTO).text(`   Ingredientes: ${ingsStr}`);
        }

        if (comida.notas) {
          doc.font('Regular').fontSize(10).fillColor(COLOR_GRIS).text(`   Nota: ${comida.notas}`);
        }

        doc.moveDown(0.6);
      }
      doc.moveDown(0.5);
    }

    // Pie de página
    doc.font('Regular').fontSize(9).fillColor(COLOR_GRIS)
       .text('Generado por AXF GymNet', 50, doc.page.height - 50, {
         align: 'center', width: doc.page.width - 100,
       });

    doc.end();
  } catch (err) {
    console.error('[GET /movil/nutricion/dietas/:id/pdf]', err);
    if (!res.headersSent) res.status(500).send('Error al generar el PDF');
  }
});

export default router;