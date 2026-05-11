-- =============================================================================
--  MIGRACIÓN: Sistema de macros automáticos por ingrediente
--  Base de datos: u544003664_axf_gymnet
--  Ejecutar en orden. Es seguro correrlo más de una vez (usa IF NOT EXISTS).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABLA `ingredientes`
--    Agregar columnas de macros por unidad base del ingrediente.
--    Ejemplo: si la unidad es "g" → macros por cada 100g
--             si la unidad es "pz" → macros por 1 pieza
--             si la unidad es "ml" → macros por cada 100ml
--             si la unidad es "taza" → macros por 1 taza
--             si la unidad es "cda" / "cdita" → macros por 1 cucharada/cucharadita
--
--    El campo `cantidad_base` indica la cantidad de referencia para los macros.
--    Ej: unidad=g, cantidad_base=100  → los macros son "por 100g"
--        unidad=pz, cantidad_base=1   → los macros son "por 1 pieza"
-- -----------------------------------------------------------------------------

ALTER TABLE `ingredientes`
  ADD COLUMN IF NOT EXISTS `cantidad_base`    decimal(8,2) NOT NULL DEFAULT 100.00
    COMMENT 'Cantidad de referencia para los macros (ej: 100 para gramos, 1 para piezas)',
  ADD COLUMN IF NOT EXISTS `kcal_base`        decimal(8,2) NOT NULL DEFAULT 0.00
    COMMENT 'Calorías por cantidad_base de unidad',
  ADD COLUMN IF NOT EXISTS `proteinas_base`   decimal(6,2) NOT NULL DEFAULT 0.00
    COMMENT 'Proteínas (g) por cantidad_base de unidad',
  ADD COLUMN IF NOT EXISTS `grasas_base`      decimal(6,2) NOT NULL DEFAULT 0.00
    COMMENT 'Grasas (g) por cantidad_base de unidad',
  ADD COLUMN IF NOT EXISTS `carbohidratos_base` decimal(6,2) NOT NULL DEFAULT 0.00
    COMMENT 'Carbohidratos (g) por cantidad_base de unidad';


-- -----------------------------------------------------------------------------
-- 2. TABLA `recetas`
--    Agregar `carbohidratos_g` que faltaba.
--    Las columnas proteinas_g, calorias, grasas_g se conservan pero ahora
--    serán calculadas automáticamente desde el backend al guardar la receta.
-- -----------------------------------------------------------------------------

ALTER TABLE `recetas`
  ADD COLUMN IF NOT EXISTS `carbohidratos_g` decimal(6,2) DEFAULT NULL
    COMMENT 'Carbohidratos totales calculados automáticamente de los ingredientes'
    AFTER `grasas_g`;


-- -----------------------------------------------------------------------------
-- 3. TABLA `receta_ingredientes`
--    La unidad de medida YA está en `ingredientes.unidad_medicion`.
--    No se necesita duplicar aquí. Solo verificamos que la tabla no tenga
--    una columna unidad_medida extra (en tu BD actual no la tiene, ✅ ok).
--    Se deja la tabla como está.
-- -----------------------------------------------------------------------------

-- (sin cambios necesarios en receta_ingredientes)


-- -----------------------------------------------------------------------------
-- 4. VISTA ÚTIL (opcional pero recomendada)
--    Calcula los macros de cada ingrediente en una receta según la cantidad usada.
--    El backend puede consultar esto directamente para calcular totales.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW `v_receta_macros` AS
SELECT
  ri.id_receta,
  ri.id_ingrediente,
  i.nombre                                             AS nombre_ingrediente,
  i.unidad_medicion,
  i.cantidad_base,
  ri.cantidad                                          AS cantidad_usada,
  -- Factor de conversión: cantidad_usada / cantidad_base
  ROUND(ri.cantidad / i.cantidad_base, 6)              AS factor,
  -- Macros proporcionales a la cantidad usada en la receta
  ROUND(i.kcal_base         * (ri.cantidad / i.cantidad_base), 2) AS kcal,
  ROUND(i.proteinas_base    * (ri.cantidad / i.cantidad_base), 2) AS proteinas_g,
  ROUND(i.grasas_base       * (ri.cantidad / i.cantidad_base), 2) AS grasas_g,
  ROUND(i.carbohidratos_base* (ri.cantidad / i.cantidad_base), 2) AS carbohidratos_g
FROM `receta_ingredientes` ri
INNER JOIN `ingredientes` i ON i.id_ingrediente = ri.id_ingrediente;


-- -----------------------------------------------------------------------------
-- 5. VISTA DE TOTALES POR RECETA
--    Suma los macros de todos los ingredientes de cada receta.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW `v_receta_totales` AS
SELECT
  id_receta,
  ROUND(SUM(kcal),            2) AS total_kcal,
  ROUND(SUM(proteinas_g),     2) AS total_proteinas_g,
  ROUND(SUM(grasas_g),        2) AS total_grasas_g,
  ROUND(SUM(carbohidratos_g), 2) AS total_carbohidratos_g
FROM `v_receta_macros`
GROUP BY id_receta;


-- =============================================================================
--  FIN DE LA MIGRACIÓN
--
--  RESUMEN DE CAMBIOS:
--  ┌─────────────────────────────────────────────────────────────────────────┐
--  │ TABLA ingredientes                                                      │
--  │   + cantidad_base      DECIMAL(8,2)  → Cantidad de referencia          │
--  │   + kcal_base          DECIMAL(8,2)  → Kcal por cantidad_base          │
--  │   + proteinas_base     DECIMAL(6,2)  → Proteínas por cantidad_base     │
--  │   + grasas_base        DECIMAL(6,2)  → Grasas por cantidad_base        │
--  │   + carbohidratos_base DECIMAL(6,2)  → Carbs por cantidad_base         │
--  ├─────────────────────────────────────────────────────────────────────────│
--  │ TABLA recetas                                                           │
--  │   + carbohidratos_g    DECIMAL(6,2)  → Carbs totales calculados        │
--  ├─────────────────────────────────────────────────────────────────────────│
--  │ VISTA v_receta_macros                                                   │
--  │   Muestra macros por ingrediente por receta                             │
--  ├─────────────────────────────────────────────────────────────────────────│
--  │ VISTA v_receta_totales                                                  │
--  │   Suma total de macros por receta (para calcular al guardar)            │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  LÓGICA DE CÁLCULO (en el backend al crear/editar receta):
--
--  Para cada ingrediente en la receta:
--    factor = cantidad_usada / ingrediente.cantidad_base
--    kcal        += ingrediente.kcal_base         * factor
--    proteinas   += ingrediente.proteinas_base    * factor
--    grasas      += ingrediente.grasas_base       * factor
--    carbohidratos += ingrediente.carbohidratos_base * factor
--
--  Esos totales se guardan en recetas.(calorias, proteinas_g, grasas_g, carbohidratos_g)
-- =============================================================================
