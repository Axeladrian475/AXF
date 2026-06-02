import './env.js';
import db from './config/database.js';

async function resetReportes() {
  try {
    console.log('Borrando reportes existentes...');
    
    // Desactivar temporalmente revisión de llaves foráneas para poder hacer truncate
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Limpiar tablas relacionadas
    await db.query('TRUNCATE TABLE strikes_reporte');
    await db.query('TRUNCATE TABLE reporte_sumados');
    await db.query('TRUNCATE TABLE reportes');
    await db.query('DELETE FROM notificaciones_sucursal WHERE tipo LIKE "reporte_personal%" OR tipo LIKE "strike%"');
    
    // Reactivar llaves foráneas
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Reportes borrados. Insertando datos de prueba...');

    // IDs de usuarios conocidos
    const suscriptorCristian = 22; // Cristian Alfonso
    const suscriptorAxel = 25;     // Axel Adrian
    const sucursalCentral = 1;
    const personalAxel = 17;
    const personalDarth = 14;

    const ahora = new Date();
    
    // Función helper para restar horas
    const restarHoras = (horas) => {
      const d = new Date(ahora.getTime() - horas * 60 * 60 * 1000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    // 1. Reporte Abierto (Sin strikes)
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, creado_en)
       VALUES (101, ?, ?, 'Maquina_Dañada', 'La caminadora número 1 no enciende. Hace ruido y luego se apaga.', 'Abierto', 0, ?)`,
      [suscriptorCristian, sucursalCentral, restarHoras(2)] // Hace 2 horas
    );

    // 2. Reporte con 1 Strike
    // Hace 26 horas
    const fecha1 = restarHoras(26);
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, creado_en)
       VALUES (102, ?, ?, 'Problema_Limpieza', 'Falta papel y jabón en el baño de hombres de la planta baja.', 'Abierto', 1, ?)`,
      [suscriptorAxel, sucursalCentral, fecha1]
    );
    await db.query(
      `INSERT INTO strikes_reporte (id_reporte, nivel, generado_en) VALUES (102, 1, ?)`,
      [restarHoras(2)] // Strike generado hace 2h
    );

    // 3. Reporte con 2 Strikes
    // Hace 50 horas
    const fecha2 = restarHoras(50);
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, creado_en)
       VALUES (103, ?, ?, 'Baño_Tapado', 'El lavamanos principal está completamente tapado y el agua no baja.', 'Abierto', 2, ?)`,
      [suscriptorCristian, sucursalCentral, fecha2]
    );
    await db.query(
      `INSERT INTO strikes_reporte (id_reporte, nivel, generado_en) VALUES (103, 1, ?), (103, 2, ?)`,
      [restarHoras(26), restarHoras(2)]
    );

    // 4. Reporte con 3 Strikes
    // Hace 74 horas
    const fecha3 = restarHoras(74);
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, creado_en)
       VALUES (104, ?, ?, 'Maquina_Dañada', 'La polea principal está trabada y el cable parece estar a punto de romperse.', 'Abierto', 3, ?)`,
      [suscriptorAxel, sucursalCentral, fecha3]
    );
    await db.query(
      `INSERT INTO strikes_reporte (id_reporte, nivel, generado_en) VALUES (104, 1, ?), (104, 2, ?), (104, 3, ?)`,
      [restarHoras(50), restarHoras(26), restarHoras(2)]
    );

    // 5. Reporte al personal
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, es_privado, id_personal_reportado, creado_en)
       VALUES (105, ?, ?, 'Reporte_Personal', 'El entrenador Darth no me quiso ayudar con mi rutina y fue muy cortante.', 'Abierto', 0, 1, ?, ?)`,
      [suscriptorCristian, sucursalCentral, personalDarth, restarHoras(1)]
    );

    // 6. Otro reporte al personal (En proceso)
    await db.query(
      `INSERT INTO reportes (id_reporte, id_suscriptor, id_sucursal, categoria, descripcion, estado, num_strikes, es_privado, id_personal_reportado, creado_en, en_proceso_por_nombre)
       VALUES (106, ?, ?, 'Reporte_Personal', 'Axel llegó tarde a nuestra sesión de entrenamiento programada.', 'En_Proceso', 0, 1, ?, ?, 'Admin Central')`,
      [suscriptorAxel, sucursalCentral, personalAxel, restarHoras(4), restarHoras(2)]
    );

    console.log('✅ Base de datos poblada con reportes de prueba exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al resetear reportes:', error);
    process.exit(1);
  }
}

resetReportes();
