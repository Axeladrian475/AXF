import './env.js';
import db from './config/database.js';

async function poblarNotificaciones() {
  try {
    console.log('Generando avisos y notificaciones en BD...');
    
    const id_sucursal = 1; // Sucursal Central

    // Obtener personal activo de la sucursal para los avisos
    const [personal] = await db.query(
      `SELECT id_personal FROM personal WHERE id_sucursal = ? AND activo = 1`,
      [id_sucursal]
    );

    const crearAvisoParaPersonal = async (mensaje) => {
      const [res] = await db.query(
        `INSERT INTO avisos (id_sucursal, mensaje) VALUES (?, ?)`,
        [id_sucursal, mensaje]
      );
      const id_aviso = res.insertId;

      if (personal.length > 0) {
        const placeholders = personal.map(() => '(?, ?)').join(', ');
        const valores = personal.flatMap(p => [id_aviso, p.id_personal]);
        await db.query(
          `INSERT INTO aviso_destinatarios (id_aviso, id_personal) VALUES ${placeholders}`,
          valores
        );
      }
    };

    // ── Para Reporte #102 (Strike 1) ──
    await crearAvisoParaPersonal('⚠️ Strike 1 en Reporte #102: Falta papel y jabón en el baño de hombres de la planta baja.');

    // ── Para Reporte #103 (Strike 2) ──
    await crearAvisoParaPersonal('⚠️ Strike 2 en Reporte #103: El lavamanos principal está completamente tapado y el agua no baja.');
    await db.query(
      `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje) VALUES (?, ?, ?, ?)`,
      [id_sucursal, 'strike_2', 103, 'Tu reporte ha sido escalado a nivel 2 por superar las 48h sin resolución.']
    );

    // ── Para Reporte #104 (Strike 3) ──
    await crearAvisoParaPersonal('⚠️ Strike 3 en Reporte #104: La polea principal está trabada y el cable parece estar a punto de romperse.');
    await db.query(
      `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje) VALUES (?, ?, ?, ?)`,
      [id_sucursal, 'strike_3', 104, 'ALERTA CRÍTICA: Strike 3. El reporte lleva más de 72 horas sin resolver.']
    );

    // ── Para Reportes Personales (105 y 106) ──
    await db.query(
      `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje) VALUES (?, ?, ?, ?)`,
      [id_sucursal, 'reporte_personal', 105, 'Nuevo reporte confidencial hacia miembro del personal.']
    );
    await db.query(
      `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje) VALUES (?, ?, ?, ?)`,
      [id_sucursal, 'reporte_personal', 106, 'Nuevo reporte confidencial hacia miembro del personal.']
    );

    console.log('✅ Avisos para personal y notificaciones para sucursal insertados.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

poblarNotificaciones();
