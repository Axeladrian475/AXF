-- =============================================================================
-- OPCIONAL — Solo si al eliminar una sucursal falla por datos multisucursales
-- (dietas/rutinas/registros de suscriptores migrados a otra sucursal).
-- Ejecutar una vez en el servidor si lo necesitas.
-- =============================================================================

ALTER TABLE `dietas`
  MODIFY `id_nutriologo` int(10) UNSIGNED NULL;

ALTER TABLE `rutinas`
  MODIFY `id_entrenador` int(10) UNSIGNED NULL;

ALTER TABLE `registros_fisicos`
  MODIFY `id_nutriologo` int(10) UNSIGNED NULL;

-- Permite desvincular al nutriólogo/entrenador eliminado sin borrar la dieta/rutina del suscriptor migrado.
