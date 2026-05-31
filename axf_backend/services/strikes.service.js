// ============================================================================
//  services/strikes.service.js
//
//  Motor de escalada de strikes — se ejecuta periódicamente (cada hora).
//
//  REGLAS según propuesta:
//    Strike 1 → 24h sin actividad desde creación del reporte
//               Notifica: todo el personal de la sucursal
//    Strike 2 → 24h adicionales (48h total) sin pasar de "En_Proceso" a "Resuelto"
//               Notifica: personal + usuario Sucursal
//    Strike 3 → 24h adicionales (72h total)
//               Notifica: Sucursal (urgente) + suscriptor
//
//  Los tiempos son configurables por sucursal en config_reportes_periodicos
//  (columnas horas_strike1, horas_strike2, horas_strike3).
// ============================================================================

import db from '../config/database.js';

// ─── Constantes default (si la sucursal no tiene config personalizada) ────────
const DEFAULT_HORAS = { strike1: 24, strike2: 24, strike3: 24 };

// ════════════════════════════════════════════════════════════════════════════
//  procesarStrikes()
//  Función principal. Recorre todos los reportes abiertos y aplica la lógica
//  de escalada según el tiempo transcurrido.
// ════════════════════════════════════════════════════════════════════════════
export async function procesarStrikes() {
  const inicio = Date.now();
  console.log(`[STRIKES] ▶ Procesando escalada... ${new Date().toISOString()}`);

  try {
    // ── 1. Obtener TODOS los reportes no resueltos ────────────────────────────
    const [reportes] = await db.query(
      `SELECT
         r.id_reporte,
         r.id_sucursal,
         r.id_suscriptor,
         r.num_strikes,
         r.estado,
         r.creado_en,
         -- Hora del último strike (si existe)
         (SELECT MAX(sr.generado_en)
          FROM strikes_reporte sr
          WHERE sr.id_reporte = r.id_reporte) AS ultimo_strike_en,
         -- Config de tiempos de la sucursal
         COALESCE(cfg.horas_strike1, ?)       AS horas_strike1,
         COALESCE(cfg.horas_strike2, ?)       AS horas_strike2,
         COALESCE(cfg.horas_strike3, ?)       AS horas_strike3
       FROM reportes r
       LEFT JOIN config_reportes_periodicos cfg ON cfg.id_sucursal = r.id_sucursal
       WHERE r.estado != 'Resuelto'
         AND r.num_strikes < 3`,
      [DEFAULT_HORAS.strike1, DEFAULT_HORAS.strike2, DEFAULT_HORAS.strike3]
    );

    let aplicados = 0;

    for (const reporte of reportes) {
      const nuevoNivel = await evaluarReporte(reporte);
      if (nuevoNivel > 0) aplicados++;
    }

    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
    console.log(`[STRIKES] ✔ Procesados ${reportes.length} reportes, ${aplicados} strikes aplicados (${duracion}s)`);

  } catch (error) {
    console.error('[STRIKES] ❌ Error en procesarStrikes:', error.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  evaluarReporte(reporte)
//  Decide si un reporte debe recibir el siguiente nivel de strike.
//  Retorna el nivel aplicado (1/2/3) o 0 si no corresponde.
// ════════════════════════════════════════════════════════════════════════════
async function evaluarReporte(reporte) {
  const ahora = new Date();
  const creado = new Date(reporte.creado_en);
  const horasDesdeCreacion = (ahora - creado) / 3_600_000;

  const strikeActual = reporte.num_strikes; // 0, 1 o 2

  // Calcular horas acumuladas necesarias para cada strike
  const umbralS1 = reporte.horas_strike1;
  const umbralS2 = umbralS1 + reporte.horas_strike2;
  const umbralS3 = umbralS2 + reporte.horas_strike3;

  let nuevoStrike = 0;

  if (strikeActual === 0 && horasDesdeCreacion >= umbralS1) {
    nuevoStrike = 1;
  } else if (strikeActual === 1 && horasDesdeCreacion >= umbralS2) {
    nuevoStrike = 2;
  } else if (strikeActual === 2 && horasDesdeCreacion >= umbralS3) {
    nuevoStrike = 3;
  }

  if (nuevoStrike === 0) return 0;

  // ── Verificar que no se haya registrado ya este nivel de strike ───────────
  const [[yaExiste]] = await db.query(
    `SELECT id_strike FROM strikes_reporte
     WHERE id_reporte = ? AND nivel = ?`,
    [reporte.id_reporte, nuevoStrike]
  );
  if (yaExiste) return 0;

  // ── Aplicar el strike ─────────────────────────────────────────────────────
  await aplicarStrike(reporte, nuevoStrike);
  return nuevoStrike;
}

// ════════════════════════════════════════════════════════════════════════════
//  aplicarStrike(reporte, nivel)
//  Registra el strike en BD, notifica a los usuarios correspondientes
//  y actualiza num_strikes en el reporte.
// ════════════════════════════════════════════════════════════════════════════
async function aplicarStrike(reporte, nivel) {
  const { id_reporte, id_sucursal, id_suscriptor } = reporte;

  console.log(`[STRIKES] ⚡ Strike ${nivel} → Reporte #${id_reporte} (Sucursal ${id_sucursal})`);

  // ── 1. Obtener personal de la sucursal ────────────────────────────────────
  const [personal] = await db.query(
    `SELECT id_personal, nombres, apellido_paterno, puesto
     FROM personal
     WHERE id_sucursal = ? AND activo = 1`,
    [id_sucursal]
  );

  // ── 2. Obtener datos de la sucursal ───────────────────────────────────────
  const [[sucursal]] = await db.query(
    `SELECT id_sucursal, nombre FROM sucursales WHERE id_sucursal = ?`,
    [id_sucursal]
  );

  // ── 3. Obtener datos del suscriptor ───────────────────────────────────────
  const [[suscriptor]] = await db.query(
    `SELECT id_suscriptor, nombres, apellido_paterno, correo
     FROM suscriptores WHERE id_suscriptor = ?`,
    [id_suscriptor]
  );

  // ── 4. Determinar quién recibe la notificación según el nivel ─────────────
  const notificados = {};

  if (nivel >= 1) {
    // Todo el personal de la sucursal
    notificados.personal = personal.map(p => ({
      id: p.id_personal,
      nombre: `${p.nombres} ${p.apellido_paterno}`,
      puesto: p.puesto,
    }));
  }

  if (nivel >= 2) {
    // + Usuario Sucursal
    notificados.sucursal = { id: sucursal.id_sucursal, nombre: sucursal.nombre };
  }

  if (nivel >= 3) {
    // + Suscriptor
    notificados.suscriptor = {
      id: suscriptor.id_suscriptor,
      nombre: `${suscriptor.nombres} ${suscriptor.apellido_paterno}`,
      correo: suscriptor.correo,
    };
  }

  // ── 5. Registrar el strike en la tabla strikes_reporte ───────────────────
  await db.query(
    `INSERT INTO strikes_reporte (id_reporte, nivel, notificados, generado_en)
     VALUES (?, ?, ?, NOW())`,
    [id_reporte, nivel, JSON.stringify(notificados)]
  );

  // ── 6. Actualizar num_strikes en el reporte ───────────────────────────────
  await db.query(
    `UPDATE reportes SET num_strikes = ? WHERE id_reporte = ?`,
    [nivel, id_reporte]
  );

  // ── 7. Notificaciones internas (Socket.io) ────────────────────────────────
  await emitirNotificaciones(id_reporte, nivel, notificados, id_sucursal, suscriptor);

  // ── 8. Log detallado para depuración ─────────────────────────────────────
  const msg = {
    1: `1er Strike: Notificados ${personal.length} personal`,
    2: `2do Strike: Notificados ${personal.length} personal + sucursal`,
    3: `3er Strike: Notificados ${personal.length} personal + sucursal + suscriptor`,
  };
  console.log(`[STRIKES]   → ${msg[nivel]} (Reporte #${id_reporte})`);
}

// ════════════════════════════════════════════════════════════════════════════
//  emitirNotificaciones()
//  Envía eventos Socket.io a las salas correspondientes para actualizar
//  la interfaz en tiempo real sin recargar la página.
// ════════════════════════════════════════════════════════════════════════════
async function emitirNotificaciones(id_reporte, nivel, notificados, id_sucursal, suscriptor) {
  try {
    const { getIO } = await import('../config/socket.js');
    const io = getIO();

    const payload = {
      id_reporte,
      nivel,
      mensaje: mensajeStrike(nivel),
      generado_en: new Date().toISOString(),
    };

    // Notificar a cada miembro del personal en su sala
    if (notificados.personal) {
      notificados.personal.forEach(p => {
        io.to(`personal:${p.id}`).emit('alerta:strike', payload);
      });
    }

    // Notificar a la sala de la sucursal (nivel 2+)
    if (nivel >= 2) {
      io.to(`sucursal:${id_sucursal}`).emit('alerta:strike', {
        ...payload,
        urgente: nivel === 3,
      });
    }

    // Notificar al suscriptor (nivel 3)
    if (nivel >= 3 && suscriptor) {
      io.to(`suscriptor:${suscriptor.id_suscriptor}`).emit('alerta:reporte_escalado', {
        id_reporte,
        nivel,
        mensaje: `Tu reporte #${id_reporte} ha activado una alerta de nivel ${nivel}. Estamos trabajando en resolverlo.`,
        puede_reenviar: true, // Habilita el botón "Reenviar a Sucursal" en la app móvil
      });
    }

    // ── Guardar notificación persistente en BD para la sucursal (solo Strike 3)
    if (nivel === 3) {
      try {
        await db.query(
          `INSERT INTO notificaciones_sucursal (id_sucursal, tipo, id_reporte, mensaje)
           VALUES (?, 'strike_3', ?, ?)`,
          [id_sucursal, id_reporte, payload.mensaje]
        );
      } catch (dbErr) {
        console.error('[STRIKES] Error al guardar notificación persistente:', dbErr.message);
      }
    }
  } catch (err) {
    // Socket.io no disponible (desarrollo sin WS), o error general
  }
}

// ─── Textos de los strikes ────────────────────────────────────────────────────
function mensajeStrike(nivel) {
  const msgs = {
    1: '⚠️ 1er Strike: Un reporte lleva más de 24h sin atención. Se notificó al personal de la sucursal.',
    2: '🔶 2do Strike: Un reporte lleva más de 48h sin resolución. Se notificó al personal y a la gerencia.',
    3: '🚨 3er Strike: Un reporte lleva más de 72h sin resolución. Escalada máxima activada.',
  };
  return msgs[nivel] ?? 'Alerta de strike generada.';
}

// ════════════════════════════════════════════════════════════════════════════
//  ENDPOINTS de gestión manual de strikes
// ════════════════════════════════════════════════════════════════════════════

// GET /api/reportes/strikes/config
// Devuelve la configuración de tiempos de strikes para la sucursal del usuario
export async function getConfigStrikes(req, res) {
  try {
    let id_sucursal = req.usuario.rol === 'sucursal' ? req.usuario.id : null;
    if (req.usuario.rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ?`, [req.usuario.id]
      );
      id_sucursal = emp?.id_sucursal;
    }

    if (!id_sucursal) {
      // Maestro: devolver config general (primera fila o defaults)
      const [[cfg]] = await db.query(
        `SELECT horas_strike1, horas_strike2, horas_strike3 FROM config_reportes_periodicos LIMIT 1`
      );
      return res.json(cfg ?? { horas_strike1: 24, horas_strike2: 24, horas_strike3: 24 });
    }

    const [[cfg]] = await db.query(
      `SELECT horas_strike1, horas_strike2, horas_strike3
       FROM config_reportes_periodicos
       WHERE id_sucursal = ?`,
      [id_sucursal]
    ).catch(() => [[null]]);

    res.json(cfg ?? { horas_strike1: 24, horas_strike2: 24, horas_strike3: 24 });
  } catch (error) {
    console.error('[GET /reportes/strikes/config]', error);
    res.status(500).json({ message: 'Error al obtener configuración.' });
  }
}

// PUT /api/reportes/strikes/config
// Actualiza los tiempos de escalada de una sucursal
// Body: { horas_strike1: 24, horas_strike2: 24, horas_strike3: 24 }
export async function setConfigStrikes(req, res) {
  try {
    if (!['sucursal', 'maestro'].includes(req.usuario.rol)) {
      return res.status(403).json({ message: 'Solo sucursal o maestro pueden cambiar esta configuración.' });
    }

    const { horas_strike1, horas_strike2, horas_strike3 } = req.body;
    const h1 = parseInt(horas_strike1);
    const h2 = parseInt(horas_strike2);
    const h3 = parseInt(horas_strike3);

    if ([h1, h2, h3].some(h => isNaN(h) || h < 1 || h > 720)) {
      return res.status(400).json({ message: 'Las horas deben ser un número entre 1 y 720.' });
    }

    const id_sucursal = req.usuario.rol === 'sucursal' ? req.usuario.id : req.body.id_sucursal;
    if (!id_sucursal) return res.status(400).json({ message: 'id_sucursal requerido para maestro.' });

    await db.query(
      `INSERT INTO config_reportes_periodicos
         (id_sucursal, frecuencia_dias, frecuencia_tipo, valor, horas_strike1, horas_strike2, horas_strike3)
       VALUES (?, 7, 'dias', 7, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         horas_strike1 = VALUES(horas_strike1),
         horas_strike2 = VALUES(horas_strike2),
         horas_strike3 = VALUES(horas_strike3)`,
      [id_sucursal, h1, h2, h3]
    );

    res.json({
      message: `Tiempos actualizados: Strike 1 → ${h1}h, Strike 2 → ${h2}h adicionales, Strike 3 → ${h3}h adicionales.`,
      config: { horas_strike1: h1, horas_strike2: h2, horas_strike3: h3 },
    });
  } catch (error) {
    console.error('[PUT /reportes/strikes/config]', error);
    res.status(500).json({ message: 'Error al actualizar configuración.' });
  }
}

// POST /api/reportes/strikes/procesar  (admin/debug)
// Dispara manualmente el motor de escalada (útil en desarrollo o para forzar)
export async function procesarManual(req, res) {
  if (req.usuario.rol !== 'maestro') {
    return res.status(403).json({ message: 'Solo el maestro puede forzar el procesamiento.' });
  }
  try {
    await procesarStrikes();
    res.json({ message: 'Procesamiento de strikes ejecutado manualmente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar strikes.', error: error.message });
  }
}
