import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const FONT_REGULAR = path.join(__dirname, '..', 'fonts', 'DejaVuSans.ttf');
const FONT_BOLD    = path.join(__dirname, '..', 'fonts', 'DejaVuSans-Bold.ttf');

const DIAS = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

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

export async function generarDietaPDFBuffer(id_dieta, id_suscriptor) {
  const dieta = await cargarDietaDetalle(id_dieta, id_suscriptor);
  if (!dieta) throw new Error('Dieta no encontrada');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      doc.registerFont('Regular', FONT_REGULAR);
      doc.registerFont('Bold',    FONT_BOLD);

      const COLOR_TITULO = '#1A2E45';
      const COLOR_DIA    = '#E87722';
      const COLOR_TEXTO  = '#333333';
      const COLOR_GRIS   = '#666666';

      doc.font('Bold').fontSize(22).fillColor(COLOR_TITULO).text('Plan Nutricional', { align: 'center' });
      doc.font('Regular').fontSize(11).fillColor(COLOR_GRIS)
         .text(`#${dieta.id_dieta}  ·  Nutriólogo: ${dieta.nutriologo}`, { align: 'center' });

      const fechaStr = new Date(dieta.creado_en).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      doc.text(`Fecha: ${fechaStr}`, { align: 'center' });
      doc.moveDown(1.5);

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

      doc.font('Regular').fontSize(9).fillColor(COLOR_GRIS)
         .text('Generado por AXF GymNet', 50, doc.page.height - 50, {
           align: 'center', width: doc.page.width - 100,
         });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generarRutinaPDFBuffer(id_rutina, id_suscriptor) {
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
  if (!rutina) throw new Error('Rutina no encontrada');

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

  const bloquesMap = new Map();
  for (const ej of ejercicios) {
    const idx    = Math.floor(ej.orden / 100);
    const nombre = ej.nombre_bloque || ej.grupo_muscular || `Bloque ${idx + 1}`;
    if (!bloquesMap.has(idx)) bloquesMap.set(idx, { nombre, ejercicios: [] });
    bloquesMap.get(idx).ejercicios.push(ej);
  }
  const bloques = [...bloquesMap.values()];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      doc.registerFont('Regular', FONT_REGULAR);
      doc.registerFont('Bold',    FONT_BOLD);

      const C_TITULO = '#1A2E45';
      const C_BLOQUE = '#E87722';
      const C_TEXTO  = '#333333';
      const C_GRIS   = '#666666';

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

      if (rutina.notas_pdf) {
        doc.font('Bold').fontSize(11).fillColor(C_TITULO).text('Notas del entrenador:');
        doc.font('Regular').fontSize(10).fillColor(C_TEXTO).text(rutina.notas_pdf);
        doc.moveDown();
      }

      doc.font('Regular').fontSize(9).fillColor(C_GRIS)
         .text('Generado por AXF GymNet', 50, doc.page.height - 50, {
           align: 'center', width: doc.page.width - 100,
         });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
