-- Agregar 'strike_2' como tipo válido en notificaciones_sucursal
-- Necesario para que el 2do strike pueda guardar notificaciones persistentes
ALTER TABLE `notificaciones_sucursal`
  MODIFY COLUMN `tipo` enum('reporte_personal','strike_2','strike_3') NOT NULL;
