-- =============================================================================
-- Migración: contraseña recuperable para sucursales (módulo maestro "Ver")
-- Ejecutar en el servidor (phpMyAdmin o cliente MySQL/MariaDB).
-- Base: u544003664_axf_gymnet (ajusta el USE si aplica)
-- =============================================================================

-- USE `u544003664_axf_gymnet`;

-- 1) Agregar columna (si ya existe, MySQL devolverá error #1060 — puede ignorarlo)
ALTER TABLE `sucursales`
  ADD COLUMN `password_enc` TEXT NULL DEFAULT NULL
  COMMENT 'Contraseña cifrada AES; solo recuperable por maestro vía API'
  AFTER `password_hash`;

-- 2) Ver qué sucursales pueden usar "Ver contraseña" hoy
SELECT
  `id_sucursal`,
  `nombre`,
  `usuario`,
  CASE
    WHEN `password_enc` IS NOT NULL AND `password_enc` <> '' THEN 'SI — botón Ver funcionará'
    ELSE 'NO — abra Modificar y guarde la contraseña otra vez'
  END AS `ver_password`
FROM `sucursales`
WHERE `activa` = 1
ORDER BY `id_sucursal`;

-- =============================================================================
-- IMPORTANTE
-- =============================================================================
-- No se puede rellenar password_enc desde password_hash (bcrypt no es reversible).
-- Para cada sucursal con ver_password = 'NO':
--   1. En la app (maestro) → Modificar sucursal
--   2. Escribir la contraseña (la misma de siempre o una nueva) y Guardar
-- Eso guarda password_hash + password_enc y habilita "Ver".
--
-- Opcional: comprobar que la columna quedó creada
-- SHOW COLUMNS FROM `sucursales` LIKE 'password_enc';
