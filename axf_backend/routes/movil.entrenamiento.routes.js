// ============================================================================
//  routes/movil.entrenamiento.routes.js
//  Endpoints de entrenamiento/rutinas para la app móvil (suscriptores)
//
//  Rutas registradas en index.js como:
//    app.use('/api/movil/entrenamiento', movilEntrenamientoRoutes);
//
//  GET /api/movil/entrenamiento/rutinas/:id/pdf?token=<jwt>  → PDF descargable
// ============================================================================

import express     from 'express';
import jwt         from 'jsonwebtoken';
import db          from '../config/database.js';
import PDFDocument from 'pdfkit';
import path        from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const FONT_REG   = path.join(__dirname, '..', 'fonts', 'DejaVuSans.ttf');
const FONT_BLD   = path.join(__dirname, '..', 'fonts', 'DejaVuSans-Bold.ttf');

const router = express.Router();

// ── Middleware: verifica token desde query param ?token=... ─────────────────
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

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/movil/entrenamiento/rutinas/:id/pdf?token=<jwt>
//  Se abre directamente en el navegador del dispositivo (igual que dietas).
// ════════════════════════════════════════════════════════════════════════════
router.get('/rutinas/:id/pdf', verificarSuscriptorQuery, async (req, res) => {
  try {
    const id_suscriptor = req.usuario.id;
    const id_rutina     = parseInt(req.params.id, 10);
    if (isNaN(id_rutina)) return res.status(400).send('ID de rutina inválido');

    // Datos de la rutina
    const [[rutina]] = await db.query(
      `SELECT r.id_rutina, r.notas_pdf,
              DATE_FORMAT(r.creado_en, '%Y-%m-%dT%H:%i:%s.000Z') AS creado_en,
              COALESCE(CONCAT(p.nombres, ' ', p.apellido_paterno), 'Entrenador') AS entrenador,
              sus.nombres AS suscriptor_nombre
       FROM rutinas r
       LEFT JOIN personal     p   ON p.id_personal    = r.id_entrenador
       LEFT JOIN suscriptores sus ON sus.id_suscriptor = r.id_suscriptor
       WHERE r.id_rutina = ? AND r.id_suscriptor = ?`,
      [id_rutina, id_suscriptor]
    );
    if (!rutina) return res.status(404).send('Rutina no encontrada');

    // Ejercicios
    const [ejercicios] = await db.query(
      `SELECT re.orden, re.series, re.repeticiones,
              re.descanso_seg, re.peso_kg, re.descripcion_tecnica,
              re.nombre_bloque, e.nombre, e.grupo_muscular
       FROM rutina_ejercicios re
       JOIN ejercicios e ON e.id_ejercicio = re.id_ejercicio
       WHERE re.id_rutina = ?
       ORDER BY re.orden ASC`,
      [id_rutina]
    );

    // Agrupar por bloque
    const bloquesMap = new Map();
    for (const ej of ejercicios) {
      const idx    = Math.floor(ej.orden / 100);
      const nombre = ej.nombre_bloque || ej.grupo_muscular || `Bloque ${idx + 1}`;
      if (!bloquesMap.has(idx)) bloquesMap.set(idx, { nombre, ejercicios: [] });
      bloquesMap.get(idx).ejercicios.push(ej);
    }
    const bloques = [...bloquesMap.values()];

    // ── Generar PDF ─────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.registerFont('Regular', FONT_REG);
    doc.registerFont('Bold',    FONT_BLD);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rutina_${id_rutina}.pdf"`);
    doc.pipe(res);

    const C_TITULO = '#1A2E45';
    const C_BLOQUE = '#E87722';
    const C_TEXTO  = '#333333';
    const C_GRIS   = '#666666';

    // Encabezado
    doc.font('Bold').fontSize(22).fillColor(C_TITULO)
       .text('Plan de Entrenamiento', { align: 'center' });
    doc.font('Regular').fontSize(11).fillColor(C_GRIS)
       .text(`#${rutina.id_rutina}  ·  Entrenador: ${rutina.entrenador}`, { align: 'center' });

    const fechaStr = new Date(rutina.creado_en).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.text(`Fecha: ${fechaStr}`, { align: 'center' });
    if (rutina.suscriptor_nombre) {
      doc.text(`Atleta: ${rutina.suscriptor_nombre}`, { align: 'center' });
    }
    doc.moveDown(1.5);

    // Bloques y ejercicios
    for (const bloque of bloques) {
      doc.font('Bold').fontSize(13).fillColor(C_BLOQUE)
         .text(bloque.nombre.toUpperCase());
      doc.moveDown(0.3);

      for (const ej of bloque.ejercicios) {
        doc.font('Bold').fontSize(11).fillColor(C_TITULO)
           .text(`• ${ej.nombre}`);

        const volumen = [];
        if (ej.series)       volumen.push(`${ej.series} series`);
        if (ej.repeticiones) volumen.push(`${ej.repeticiones} reps`);
        if (ej.peso_kg)      volumen.push(`${ej.peso_kg} kg`);
        if (ej.descanso_seg) volumen.push(`${ej.descanso_seg}s descanso`);
        if (volumen.length > 0) {
          doc.font('Regular').fontSize(10).fillColor(C_GRIS)
             .text(`   ${volumen.join('  ·  ')}`);
        }

        if (ej.descripcion_tecnica) {
          doc.font('Regular').fontSize(10).fillColor(C_TEXTO)
             .text(`   Técnica: ${ej.descripcion_tecnica}`);
        }

        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
    }

    // Notas del entrenador
    if (rutina.notas_pdf) {
      doc.font('Bold').fontSize(11).fillColor(C_TITULO).text('Notas del entrenador:');
      doc.font('Regular').fontSize(10).fillColor(C_TEXTO).text(rutina.notas_pdf);
      doc.moveDown();
    }

    // Pie de página
    doc.font('Regular').fontSize(9).fillColor(C_GRIS)
       .text('Generado por AXF GymNet', 50, doc.page.height - 50, {
         align: 'center', width: doc.page.width - 100,
       });

    doc.end();
  } catch (err) {
    console.error('[GET /movil/entrenamiento/rutinas/:id/pdf]', err);
    if (!res.headersSent) res.status(500).send('Error al generar el PDF');
  }
});

export default router;
