// ============================================================================
//  services/racha.semanal.service.js
//  Estadísticas de asistencia semanal (semana domingo → sábado, resetea domingo)
// ============================================================================

/**
 * Semana AXF: domingo 00:00 → sábado 23:59. Contadores se restablecen cada domingo.
 */
export async function calcularEstadisticasSemana(db, id_suscriptor, diasDescanso = 0) {
  const descanso = Math.min(Math.max(Number(diasDescanso) || 0, 0), 6);

  const [[semana]] = await db.query(
    `SELECT COUNT(DISTINCT DATE(fecha_hora)) AS asistencias_semana
     FROM accesos
     WHERE id_suscriptor = ?
       AND resultado = 'Permitido'
       AND tipo_movimiento = 'Entrada'
       AND DATE(fecha_hora) >= DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE()) - 1 DAY)
       AND DATE(fecha_hora) <= CURDATE()`,
    [id_suscriptor]
  );

  const asistenciasSemana = Number(semana?.asistencias_semana ?? 0);
  const diasObligatorios  = 7 - descanso;

  // JS: 0=Dom … 6=Sáb → días transcurridos en la semana (domingo = 1)
  const hoy             = new Date();
  const diaSemana       = hoy.getDay();
  const diasTranscurridos = diaSemana + 1;
  const diasRestantesSemana = 7 - diasTranscurridos;

  const faltasUsadas    = Math.max(diasTranscurridos - asistenciasSemana, 0);
  const faltasRestantes = Math.max(descanso - faltasUsadas, 0);
  const visitasPendientes = Math.max(diasObligatorios - asistenciasSemana, 0);

  // Próximo domingo (inicio de semana nueva)
  const diasHastaReset = diaSemana === 0 ? 7 : 7 - diaSemana;
  const proximoReset   = new Date(hoy);
  proximoReset.setDate(hoy.getDate() + diasHastaReset);
  const proximoResetStr = proximoReset.toISOString().split('T')[0];

  return {
    asistencias_semana:      asistenciasSemana,
    faltas_restantes:        faltasRestantes,
    faltas_permitidas_semana: descanso,
    faltas_usadas:           faltasUsadas,
    dias_obligatorios:       diasObligatorios,
    visitas_pendientes:      visitasPendientes,
    dias_restantes_semana:   diasRestantesSemana,
    dias_hasta_reset:        diasHastaReset,
    proximo_reset:           proximoResetStr,
  };
}
