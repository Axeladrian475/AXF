-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 28-03-2026 a las 00:31:30
-- Versión del servidor: 11.8.6-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u544003664_axf_gymnet`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `accesos`
--

CREATE TABLE `accesos` (
  `id_acceso` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `metodo` enum('NFC','Huella') NOT NULL,
  `resultado` enum('Permitido','Denegado_Sin_Sub','Denegado_No_Encontrado') NOT NULL,
  `fecha_hora` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `accesos`
--

INSERT INTO `accesos` (`id_acceso`, `id_suscriptor`, `id_sucursal`, `metodo`, `resultado`, `fecha_hora`) VALUES
(1, 7, 1, 'NFC', 'Denegado_Sin_Sub', '2026-03-24 01:17:30'),
(2, 7, 1, 'Huella', 'Denegado_Sin_Sub', '2026-03-24 01:18:25'),
(3, 7, 1, 'NFC', 'Denegado_Sin_Sub', '2026-03-24 02:31:11');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administradores`
--

CREATE TABLE `administradores` (
  `id_admin` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `administradores`
--

INSERT INTO `administradores` (`id_admin`, `nombre`, `usuario`, `password_hash`, `creado_en`) VALUES
(1, 'Axel Aguirre', 'admin_maestro', '$2b$10$wNVUwsO0MM3azIFVftN/LunOxYzlnY/Kh0RGBDFBjwNI8hH9NxcJS', '2026-03-04 01:17:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `avisos`
--

CREATE TABLE `avisos` (
  `id_aviso` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `mensaje` text NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `avisos`
--

INSERT INTO `avisos` (`id_aviso`, `id_sucursal`, `mensaje`, `creado_en`) VALUES
(1, 1, 'hola mundo', '2026-03-11 01:10:08'),
(2, 1, 'hola mundo', '2026-03-11 01:24:45'),
(3, 1, 'caca', '2026-03-11 01:25:14'),
(4, 1, 'hola staff_entrenador', '2026-03-11 01:34:05'),
(5, 1, 'hola nutriologo', '2026-03-11 01:34:16'),
(6, 1, 'hola todo el personal', '2026-03-11 01:34:26'),
(7, 1, 'jhjvbhji', '2026-03-13 13:49:02'),
(8, 1, 'oña muñaño', '2026-03-13 14:11:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `aviso_destinatarios`
--

CREATE TABLE `aviso_destinatarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_aviso` int(10) UNSIGNED NOT NULL,
  `id_personal` int(10) UNSIGNED NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `aviso_destinatarios`
--

INSERT INTO `aviso_destinatarios` (`id`, `id_aviso`, `id_personal`, `leido`) VALUES
(1, 1, 1, 0),
(2, 1, 2, 0),
(3, 1, 3, 0),
(4, 1, 4, 0),
(5, 2, 1, 0),
(6, 2, 2, 0),
(7, 2, 3, 0),
(8, 2, 4, 0),
(9, 3, 1, 0),
(10, 3, 2, 0),
(11, 3, 3, 0),
(12, 3, 4, 0),
(13, 4, 1, 0),
(14, 4, 2, 0),
(15, 4, 3, 0),
(16, 5, 1, 0),
(17, 5, 2, 0),
(18, 5, 4, 0),
(19, 6, 1, 0),
(20, 6, 2, 0),
(21, 6, 3, 0),
(22, 6, 4, 0),
(23, 7, 1, 0),
(24, 7, 2, 0),
(25, 7, 3, 0),
(26, 7, 4, 0),
(27, 8, 1, 0),
(28, 8, 2, 0),
(29, 8, 3, 0),
(30, 8, 4, 0),
(31, 8, 8, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `canjes`
--

CREATE TABLE `canjes` (
  `id_canje` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_recompensa` int(10) UNSIGNED NOT NULL,
  `id_personal` int(10) UNSIGNED NOT NULL,
  `puntos_gastados` int(10) UNSIGNED NOT NULL,
  `canjeado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chat_mensajes`
--

CREATE TABLE `chat_mensajes` (
  `id_mensaje` int(10) UNSIGNED NOT NULL,
  `id_personal` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `enviado_por` enum('personal','suscriptor') NOT NULL,
  `contenido` text NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT 0,
  `enviado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `config_reportes_periodicos`
--

CREATE TABLE `config_reportes_periodicos` (
  `id_config` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `frecuencia_dias` int(10) UNSIGNED NOT NULL DEFAULT 7 COMMENT 'Cada cuántos días se genera el informe',
  `frecuencia_tipo` enum('dias','semanas','meses') NOT NULL DEFAULT 'dias' COMMENT 'Unidad de tiempo elegida por la sucursal',
  `valor` int(10) UNSIGNED NOT NULL DEFAULT 7 COMMENT 'Cantidad de la unidad (ej. 3 d?as, 2 semanas, 1 mes)',
  `ultimo_envio` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `proximo_envio` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Fecha calculada del pr?ximo informe'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `config_reportes_periodicos`
--

INSERT INTO `config_reportes_periodicos` (`id_config`, `id_sucursal`, `frecuencia_dias`, `frecuencia_tipo`, `valor`, `ultimo_envio`, `proximo_envio`) VALUES
(1, 1, 28, 'semanas', 4, '2026-03-27 14:27:08', '2026-04-24 14:27:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dietas`
--

CREATE TABLE `dietas` (
  `id_dieta` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_nutriologo` int(10) UNSIGNED NOT NULL,
  `enviada_app` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dieta_comidas`
--

CREATE TABLE `dieta_comidas` (
  `id_comida` int(10) UNSIGNED NOT NULL,
  `id_dieta` int(10) UNSIGNED NOT NULL,
  `dia` tinyint(3) UNSIGNED NOT NULL COMMENT '1=Lunes, 2=Martes, ... 7=Domingo',
  `orden_comida` tinyint(3) UNSIGNED NOT NULL,
  `descripcion` text DEFAULT NULL,
  `id_receta` int(10) UNSIGNED DEFAULT NULL,
  `calorias` decimal(8,2) DEFAULT NULL,
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ejercicios`
--

CREATE TABLE `ejercicios` (
  `id_ejercicio` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `hardware_sesiones`
--

CREATE TABLE `hardware_sesiones` (
  `id` int(10) UNSIGNED NOT NULL,
  `token` varchar(64) NOT NULL,
  `tipo` enum('nfc','huella') NOT NULL,
  `valor` text NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `estado` varchar(20) NOT NULL DEFAULT 'pending',
  `paso` varchar(50) NOT NULL DEFAULT 'esperando_dispositivo',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `template_b64` mediumtext DEFAULT NULL COMMENT 'Template biom?trico base64 enviado por el ESP32 al registrar huella',
  `sensor_id` varchar(50) DEFAULT NULL COMMENT 'Identificador ?nico del ESP32 (direcci?n MAC)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Volcado de datos para la tabla `hardware_sesiones`
--

INSERT INTO `hardware_sesiones` (`id`, `token`, `tipo`, `valor`, `usado`, `estado`, `paso`, `creado_en`, `template_b64`, `sensor_id`) VALUES
(77, '6B66389A', 'nfc', '', 1, 'error', 'timeout_nfc', '2026-03-27 23:26:34', NULL, NULL),
(78, 'FC1FFBE0', 'huella', '', 1, 'error', 'timeout_dedo_1', '2026-03-27 23:26:44', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ingredientes`
--

CREATE TABLE `ingredientes` (
  `id_ingrediente` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `unidad_medicion` varchar(50) NOT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personal`
--

CREATE TABLE `personal` (
  `id_personal` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellido_paterno` varchar(80) NOT NULL,
  `apellido_materno` varchar(80) DEFAULT NULL,
  `edad` tinyint(3) UNSIGNED NOT NULL,
  `sexo` enum('M','F','Otro') NOT NULL,
  `puesto` enum('staff','entrenador','nutriologo','entrenador_nutriologo') NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `personal`
--

INSERT INTO `personal` (`id_personal`, `id_sucursal`, `nombres`, `apellido_paterno`, `apellido_materno`, `edad`, `sexo`, `puesto`, `usuario`, `password_hash`, `foto_url`, `activo`, `creado_en`) VALUES
(1, 1, 'Axel Adrian', 'Aguirre', 'Casas', 19, 'M', 'entrenador_nutriologo', 'axl_agr', '$2b$10$WhcqLwR5ebynxc0yRT/jxu9W/D8.NOO04UDXohA2EauSZZMX8dAfy', '/uploads/personal/personal_1773153421356.png', 1, '2026-03-10 14:37:01'),
(2, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', 21, 'M', 'entrenador_nutriologo', 'Alfonso', '$2b$10$LiUNaRhVUM1rXAefAahOTOo/hSq3Nxh50nUmyJovQlbVrZGWN/YGC', '/uploads/personal/personal_1773164503664.png', 1, '2026-03-10 15:37:25'),
(3, 1, 'Alejandro', 'perez', 'diez', 32, 'F', 'entrenador', 'entrenador_1', '$2b$10$2t561C3MT2/kT2R.UMAFUOrJxhz5TZ5F6xqx7xSUuPcBGZk3fPUdK', '/uploads/personal/personal_1773157098506.png', 1, '2026-03-10 15:38:18'),
(4, 1, 'vanne', 'cortez', 'perez', 23, 'F', 'nutriologo', 'nutriologo_1', '$2b$10$uqwGzQceFsvPvWFPc/3JiOXTYtYtDyxnuGR/4VaEzJXaIj029s8J2', '/uploads/personal/personal_1773157150046.png', 1, '2026-03-10 15:39:10'),
(5, 4, 'Carlos', 'Perez', 'Sanchez', 34, 'M', 'entrenador_nutriologo', 'Carlos Avila', '$2b$10$jA0mA/m6zVZ2AlKnXJtg0OxJU4CXtImwxZ7CfovqeYglLblIDT3PO', '/uploads/personal/personal_1773158072676.jpeg', 1, '2026-03-10 15:54:32'),
(6, 4, 'Cristian Alfonso', 'Amezcua ', 'Trejo', 21, 'M', 'entrenador', 'Poncho', '$2b$10$nkchYQiTJCrEVmeweFJXO.uSx6hzK7Owl6wX37xKSePXHjsAIK7DO', '/uploads/personal/personal_1773163617977.png', 1, '2026-03-10 17:26:57'),
(7, 6, 'Alfonso', 'Amezcua', 'Trejo', 19, 'M', 'nutriologo', 'alfonso@gmail.com', '$2b$10$9oaimbYKB9mMGM/g.tg9euUi8s2d9AYyLPABB5wMNB.0mYMCr5XSK', '/uploads/personal/personal_1773410570305.jpeg', 1, '2026-03-13 14:02:50'),
(8, 1, 'cristian alfonso ', 'amezcua ', 'trejo', 19, 'M', 'nutriologo', 'Cristian', '$2b$10$JX7zmDr2bTyfgFi9UbxBN.AJqI3YEGy8jQJeY6iaIvz7ijkoGLRXC', '/uploads/personal/personal_1773410695533.jpeg', 1, '2026-03-13 14:04:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promociones`
--

CREATE TABLE `promociones` (
  `id_promocion` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `duracion_dias` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `precio` decimal(10,2) NOT NULL,
  `sesiones_nutriologo` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `sesiones_entrenador` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `promociones`
--

INSERT INTO `promociones` (`id_promocion`, `id_sucursal`, `nombre`, `descripcion`, `duracion_dias`, `precio`, `sesiones_nutriologo`, `sesiones_entrenador`, `activo`) VALUES
(1, 1, '8M ensual ', 'Promoción Mensual para mujeres por el 8M', 30, 99.00, 2, 2, 1),
(2, 1, 'PrideMont', 'gratis pa que dejes de ser marica', 30, 0.00, 1, 1, 1),
(3, 1, 'Sesiones promo', 'sesiones de nutriologo y entrenador', 0, 300.00, 10, 10, 1),
(5, 1, 'axe', NULL, 0, 1200.00, 0, 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recetas`
--

CREATE TABLE `recetas` (
  `id_receta` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `proteinas_g` decimal(6,2) DEFAULT NULL,
  `calorias` decimal(8,2) DEFAULT NULL,
  `grasas_g` decimal(6,2) DEFAULT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `receta_ingredientes`
--

CREATE TABLE `receta_ingredientes` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_receta` int(10) UNSIGNED NOT NULL,
  `id_ingrediente` int(10) UNSIGNED NOT NULL,
  `cantidad` decimal(8,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recompensas`
--

CREATE TABLE `recompensas` (
  `id_recompensa` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `costo_puntos` int(10) UNSIGNED NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `recompensas`
--

INSERT INTO `recompensas` (`id_recompensa`, `id_sucursal`, `nombre`, `costo_puntos`, `activa`) VALUES
(1, 1, 'Scoop de proteina', 1000, 1),
(2, 1, 'Pree de boca a boca por axel', 1000000, 1),
(3, 1, '2 dias gym', 900, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registros_fisicos`
--

CREATE TABLE `registros_fisicos` (
  `id_registro` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_nutriologo` int(10) UNSIGNED NOT NULL,
  `peso_kg` decimal(5,2) DEFAULT NULL,
  `altura_cm` decimal(5,2) DEFAULT NULL,
  `edad` tinyint(3) UNSIGNED DEFAULT NULL,
  `pct_grasa` decimal(5,2) DEFAULT NULL,
  `pct_musculo` decimal(5,2) DEFAULT NULL,
  `actividad` enum('Sedentario','Ligeramente_Activo','Moderadamente_Activo','Muy_Activo','Extremadamente_Activo') DEFAULT NULL,
  `objetivo` varchar(255) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `tmb` decimal(8,2) DEFAULT NULL,
  `tdee` decimal(8,2) DEFAULT NULL,
  `proteinas_min` decimal(6,2) DEFAULT NULL,
  `proteinas_max` decimal(6,2) DEFAULT NULL,
  `grasas_min` decimal(6,2) DEFAULT NULL,
  `grasas_max` decimal(6,2) DEFAULT NULL,
  `carbs_min` decimal(6,2) DEFAULT NULL,
  `carbs_max` decimal(6,2) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registro_entrenamiento`
--

CREATE TABLE `registro_entrenamiento` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_rutina_ejercicio` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `num_serie` tinyint(3) UNSIGNED NOT NULL,
  `peso_levantado` decimal(6,2) DEFAULT NULL,
  `reps_realizadas` tinyint(3) UNSIGNED DEFAULT NULL,
  `registrado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes`
--

CREATE TABLE `reportes` (
  `id_reporte` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `categoria` enum('Maquina_Dañada','Baño_Tapado','Problema_Limpieza','Reporte_Personal','Otro') NOT NULL,
  `descripcion` text NOT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `es_privado` tinyint(1) NOT NULL DEFAULT 0,
  `id_personal_reportado` int(10) UNSIGNED DEFAULT NULL,
  `sobre_atencion_previa` tinyint(1) DEFAULT NULL,
  `estado` enum('Abierto','En_Proceso','Resuelto') NOT NULL DEFAULT 'Abierto',
  `num_strikes` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `resuelto_en` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reporte_sumados`
--

CREATE TABLE `reporte_sumados` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_reporte` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `sumado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutinas`
--

CREATE TABLE `rutinas` (
  `id_rutina` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_entrenador` int(10) UNSIGNED NOT NULL,
  `notas_pdf` text DEFAULT NULL,
  `enviada_app` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutina_ejercicios`
--

CREATE TABLE `rutina_ejercicios` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_rutina` int(10) UNSIGNED NOT NULL,
  `id_ejercicio` int(10) UNSIGNED NOT NULL,
  `orden` tinyint(3) UNSIGNED NOT NULL,
  `series` tinyint(3) UNSIGNED NOT NULL,
  `repeticiones` tinyint(3) UNSIGNED NOT NULL,
  `descanso_seg` int(10) UNSIGNED DEFAULT NULL,
  `peso_kg` decimal(6,2) DEFAULT NULL,
  `descripcion_tecnica` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sensores`
--

CREATE TABLE `sensores` (
  `sensor_id` varchar(50) NOT NULL COMMENT 'MAC address del ESP32',
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL COMMENT 'Ej: "Entrada principal"',
  `ultimo_sync` timestamp NULL DEFAULT NULL,
  `registrado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sensor_huella_posiciones`
--

CREATE TABLE `sensor_huella_posiciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `sensor_id` varchar(50) NOT NULL COMMENT 'MAC address del ESP32',
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `posicion_local` smallint(5) UNSIGNED NOT NULL COMMENT 'Posici?n en la flash del sensor (0-299)',
  `cargado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `strikes_reporte`
--

CREATE TABLE `strikes_reporte` (
  `id_strike` int(10) UNSIGNED NOT NULL,
  `id_reporte` int(10) UNSIGNED NOT NULL,
  `nivel` tinyint(3) UNSIGNED NOT NULL,
  `notificados` text DEFAULT NULL,
  `generado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursales`
--

CREATE TABLE `sucursales` (
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `codigo_postal` varchar(10) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sucursales`
--

INSERT INTO `sucursales` (`id_sucursal`, `nombre`, `direccion`, `codigo_postal`, `usuario`, `password_hash`, `activa`, `creado_en`) VALUES
(1, 'Sucursal Central AxF', 'Av. Principal 1234', '45001', 'admin', '$2b$10$udVG/wsKxbxb1bLPLwrlOez9M18xNMzbhbnJXDhmgRvhigxZBPimW', 1, '2026-03-02 20:09:37'),
(4, 'Sucursal De la Normal AxF', 'avenida constituyentes', '45130', 'Normal', '$2b$10$0XGYxsEmY.61OQYHL96KPeFBjiItgpQv.hnhhK8AnKKmQNKZtYFQi', 1, '2026-03-10 15:53:57'),
(6, 'Sucursal Colomos AxF', 'Colomos 1234', '21365', 'Colomos', '$2b$10$GXZGbISoWIg9P5mnzEMP.egEp3159PGeTOuS8GAd4HpcMqiUtmU0K', 1, '2026-03-13 13:56:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `suscripciones`
--

CREATE TABLE `suscripciones` (
  `id_suscripcion` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_tipo` int(10) UNSIGNED DEFAULT NULL,
  `id_promocion` int(10) UNSIGNED DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `sesiones_nutriologo_restantes` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `sesiones_entrenador_restantes` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `estado` enum('Activa','Inactiva','Pendiente') NOT NULL DEFAULT 'Activa',
  `mp_payment_id` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscripciones`
--

INSERT INTO `suscripciones` (`id_suscripcion`, `id_suscriptor`, `id_tipo`, `id_promocion`, `fecha_inicio`, `fecha_fin`, `sesiones_nutriologo_restantes`, `sesiones_entrenador_restantes`, `estado`, `mp_payment_id`, `creado_en`) VALUES
(1, 3, 4, NULL, '2026-03-28', '2026-04-26', 3, 3, 'Activa', NULL, '2026-03-28 00:12:03'),
(2, 3, 4, NULL, '2026-04-27', '2026-05-26', 3, 3, 'Activa', NULL, '2026-03-28 00:12:30'),
(3, 3, 4, NULL, '2026-05-27', '2026-06-25', 3, 3, 'Activa', NULL, '2026-03-28 00:15:00'),
(4, 4, 1, NULL, '2026-03-28', '2027-03-27', 30, 30, 'Activa', NULL, '2026-03-28 00:19:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `suscriptores`
--

CREATE TABLE `suscriptores` (
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_sucursal_registro` int(10) UNSIGNED NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellido_paterno` varchar(80) NOT NULL,
  `apellido_materno` varchar(80) DEFAULT NULL,
  `fecha_nacimiento` date NOT NULL,
  `sexo` enum('M','F','Otro') NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `codigo_postal` varchar(10) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nfc_uid` varchar(255) DEFAULT NULL,
  `huella_template` mediumtext DEFAULT NULL COMMENT 'Template biom?trico completo en base64 (512 bytes  ~684 chars). Ya NO es n?mero de posici?n local.',
  `puntos` int(11) NOT NULL DEFAULT 0,
  `racha_dias` int(11) NOT NULL DEFAULT 0,
  `dias_descanso_semana` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `terminos_aceptados` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscriptores`
--

INSERT INTO `suscriptores` (`id_suscriptor`, `id_sucursal_registro`, `nombres`, `apellido_paterno`, `apellido_materno`, `fecha_nacimiento`, `sexo`, `direccion`, `codigo_postal`, `telefono`, `correo`, `password_hash`, `nfc_uid`, `huella_template`, `puntos`, `racha_dias`, `dias_descanso_semana`, `terminos_aceptados`, `activo`, `creado_en`) VALUES
(3, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', 'Paseo de las misiones 1581', '45130', '3317488529', 'axeladrian475@gmail.com', '$2b$12$f2cenS7LsfpxsxrfaRqVDOFG6z9YU49Gqi/9Z7FjqjtOky1mutvL2', NULL, NULL, 0, 0, 0, 1, 1, '2026-03-11 06:32:27'),
(4, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', '2006-12-31', 'M', 'Andador 17 poniente', '45157', '3323311381', 'alfonsoamezcua31@gmail.com', '$2b$12$KepMtlviw.mrZ672DnzCeOsbMLWA6j6qBF0xWxlu4pyr3kKOVkPaS', NULL, NULL, 0, 0, 0, 1, 1, '2026-03-11 06:33:10'),
(5, 1, 'Pepe', 'toño', 'torres', '2003-06-13', 'M', '1585, 4', '45130', '342523423', 'pepe@gmail.com', '$2b$12$Of8qrD7Oc55EIf/rpDN8pOdAPTceXJXKGHMAhIBUppXIeFQG.P5Cy', NULL, NULL, 0, 0, 0, 1, 0, '2026-03-13 14:19:30'),
(6, 1, 'Susana Elizabeth', 'Ferrer', 'Hernandez', '2006-11-06', 'F', 'mi casas', '45130', '2342343242', 'gusa@gmail.com', '$2b$12$NbejSyIvyX8IjiWtyjE5bOPz0Ua4XWLmGEM3Ezr33L6L66Z3aTgQO', NULL, NULL, 0, 0, 0, 1, 1, '2026-03-13 14:22:43'),
(7, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', 'paseo de las misiones 1585, 4ª', '45130', '3328490929', 'axeladrian4755@gmail.com', '$2b$12$WGBHE8bNfYpl6f5ZulFki.gjbUubMIaW6fjF3VK7LrLaBXiugHcSy', '35:F4:DC:3E', '1', 0, 0, 0, 1, 0, '2026-03-24 01:16:48'),
(8, 1, 'Pepe', 'Ferrer', 'Casas', '2007-01-08', 'M', '1585, 4', '45130', '1111111111', 'axl_agr@sasas.asas', '$2b$12$RLV2cNQ9bMFr/a3uKEgiWekxf52J6ppObVhpdNnvX64fAl2KbQm8u', '84:97:D4:E5', NULL, 0, 0, 0, 1, 1, '2026-03-24 02:53:57');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_suscripcion`
--

CREATE TABLE `tipos_suscripcion` (
  `id_tipo` int(10) UNSIGNED NOT NULL,
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `duracion_dias` int(10) UNSIGNED NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `limite_sesiones_nutriologo` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `limite_sesiones_entrenador` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tipos_suscripcion`
--

INSERT INTO `tipos_suscripcion` (`id_tipo`, `id_sucursal`, `nombre`, `duracion_dias`, `precio`, `limite_sesiones_nutriologo`, `limite_sesiones_entrenador`, `activo`) VALUES
(1, 1, 'Anual', 365, 3099.00, 30, 30, 1),
(4, 1, 'Mensual', 30, 450.00, 3, 3, 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `accesos`
--
ALTER TABLE `accesos`
  ADD PRIMARY KEY (`id_acceso`),
  ADD KEY `idx_accesos_suscriptor` (`id_suscriptor`),
  ADD KEY `idx_accesos_sucursal_fecha` (`id_sucursal`,`fecha_hora`);

--
-- Indices de la tabla `administradores`
--
ALTER TABLE `administradores`
  ADD PRIMARY KEY (`id_admin`),
  ADD UNIQUE KEY `uq_admin_usuario` (`usuario`);

--
-- Indices de la tabla `avisos`
--
ALTER TABLE `avisos`
  ADD PRIMARY KEY (`id_aviso`),
  ADD KEY `fk_aviso_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `aviso_destinatarios`
--
ALTER TABLE `aviso_destinatarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_aviso_personal` (`id_aviso`,`id_personal`),
  ADD KEY `fk_avisodet_personal` (`id_personal`);

--
-- Indices de la tabla `canjes`
--
ALTER TABLE `canjes`
  ADD PRIMARY KEY (`id_canje`),
  ADD KEY `fk_canje_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_canje_recompensa` (`id_recompensa`),
  ADD KEY `fk_canje_personal` (`id_personal`);

--
-- Indices de la tabla `chat_mensajes`
--
ALTER TABLE `chat_mensajes`
  ADD PRIMARY KEY (`id_mensaje`),
  ADD KEY `idx_chat_conversacion` (`id_personal`,`id_suscriptor`,`enviado_en`),
  ADD KEY `fk_chat_suscriptor` (`id_suscriptor`);

--
-- Indices de la tabla `config_reportes_periodicos`
--
ALTER TABLE `config_reportes_periodicos`
  ADD PRIMARY KEY (`id_config`),
  ADD UNIQUE KEY `uq_config_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `dietas`
--
ALTER TABLE `dietas`
  ADD PRIMARY KEY (`id_dieta`),
  ADD KEY `fk_dieta_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_dieta_nutriologo` (`id_nutriologo`);

--
-- Indices de la tabla `dieta_comidas`
--
ALTER TABLE `dieta_comidas`
  ADD PRIMARY KEY (`id_comida`),
  ADD KEY `fk_comida_dieta` (`id_dieta`),
  ADD KEY `fk_comida_receta` (`id_receta`);

--
-- Indices de la tabla `ejercicios`
--
ALTER TABLE `ejercicios`
  ADD PRIMARY KEY (`id_ejercicio`),
  ADD KEY `fk_ejercicio_personal` (`creado_por`);

--
-- Indices de la tabla `hardware_sesiones`
--
ALTER TABLE `hardware_sesiones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_token_tipo` (`token`,`tipo`),
  ADD KEY `idx_hw_sesiones_tipo_estado` (`tipo`,`estado`);

--
-- Indices de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  ADD PRIMARY KEY (`id_ingrediente`),
  ADD UNIQUE KEY `uq_ingrediente_nombre` (`nombre`),
  ADD KEY `fk_ingrediente_personal` (`creado_por`);

--
-- Indices de la tabla `personal`
--
ALTER TABLE `personal`
  ADD PRIMARY KEY (`id_personal`),
  ADD UNIQUE KEY `uq_personal_usuario` (`usuario`),
  ADD KEY `fk_personal_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD PRIMARY KEY (`id_promocion`),
  ADD KEY `fk_promo_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `recetas`
--
ALTER TABLE `recetas`
  ADD PRIMARY KEY (`id_receta`),
  ADD KEY `fk_receta_personal` (`creado_por`);

--
-- Indices de la tabla `receta_ingredientes`
--
ALTER TABLE `receta_ingredientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_receta_ingrediente` (`id_receta`,`id_ingrediente`),
  ADD KEY `fk_recetaing_ingrediente` (`id_ingrediente`);

--
-- Indices de la tabla `recompensas`
--
ALTER TABLE `recompensas`
  ADD PRIMARY KEY (`id_recompensa`),
  ADD KEY `fk_recompensa_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `registros_fisicos`
--
ALTER TABLE `registros_fisicos`
  ADD PRIMARY KEY (`id_registro`),
  ADD KEY `idx_regfis_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_regfis_nutriologo` (`id_nutriologo`);

--
-- Indices de la tabla `registro_entrenamiento`
--
ALTER TABLE `registro_entrenamiento`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_registro_serie` (`id_rutina_ejercicio`,`id_suscriptor`,`num_serie`),
  ADD KEY `fk_regentren_suscriptor` (`id_suscriptor`);

--
-- Indices de la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD PRIMARY KEY (`id_reporte`),
  ADD KEY `idx_reporte_sucursal_estado` (`id_sucursal`,`estado`),
  ADD KEY `fk_reporte_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_reporte_personal` (`id_personal_reportado`);

--
-- Indices de la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reporte_suscriptor` (`id_reporte`,`id_suscriptor`),
  ADD KEY `fk_sumado_suscriptor` (`id_suscriptor`);

--
-- Indices de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  ADD PRIMARY KEY (`id_rutina`),
  ADD KEY `fk_rutina_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_rutina_entrenador` (`id_entrenador`);

--
-- Indices de la tabla `rutina_ejercicios`
--
ALTER TABLE `rutina_ejercicios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rutina_ej_rutina` (`id_rutina`),
  ADD KEY `fk_rutej_ejercicio` (`id_ejercicio`);

--
-- Indices de la tabla `sensores`
--
ALTER TABLE `sensores`
  ADD PRIMARY KEY (`sensor_id`),
  ADD KEY `fk_sensor_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `sensor_huella_posiciones`
--
ALTER TABLE `sensor_huella_posiciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sensor_posicion` (`sensor_id`,`posicion_local`),
  ADD UNIQUE KEY `uq_sensor_suscriptor` (`sensor_id`,`id_suscriptor`),
  ADD KEY `fk_shp_suscriptor` (`id_suscriptor`);

--
-- Indices de la tabla `strikes_reporte`
--
ALTER TABLE `strikes_reporte`
  ADD PRIMARY KEY (`id_strike`),
  ADD KEY `fk_strike_reporte` (`id_reporte`);

--
-- Indices de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD PRIMARY KEY (`id_sucursal`),
  ADD UNIQUE KEY `uq_sucursal_usuario` (`usuario`);

--
-- Indices de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  ADD PRIMARY KEY (`id_suscripcion`),
  ADD KEY `fk_sub_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_sub_tipo` (`id_tipo`),
  ADD KEY `fk_sub_promo` (`id_promocion`);

--
-- Indices de la tabla `suscriptores`
--
ALTER TABLE `suscriptores`
  ADD PRIMARY KEY (`id_suscriptor`),
  ADD UNIQUE KEY `uq_suscriptor_correo` (`correo`),
  ADD UNIQUE KEY `uq_suscriptor_nfc` (`nfc_uid`),
  ADD KEY `fk_suscriptor_sucursal` (`id_sucursal_registro`);

--
-- Indices de la tabla `tipos_suscripcion`
--
ALTER TABLE `tipos_suscripcion`
  ADD PRIMARY KEY (`id_tipo`),
  ADD KEY `fk_tipo_sub_sucursal` (`id_sucursal`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `accesos`
--
ALTER TABLE `accesos`
  MODIFY `id_acceso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `id_admin` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `avisos`
--
ALTER TABLE `avisos`
  MODIFY `id_aviso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `aviso_destinatarios`
--
ALTER TABLE `aviso_destinatarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `canjes`
--
ALTER TABLE `canjes`
  MODIFY `id_canje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `chat_mensajes`
--
ALTER TABLE `chat_mensajes`
  MODIFY `id_mensaje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `config_reportes_periodicos`
--
ALTER TABLE `config_reportes_periodicos`
  MODIFY `id_config` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `dietas`
--
ALTER TABLE `dietas`
  MODIFY `id_dieta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `dieta_comidas`
--
ALTER TABLE `dieta_comidas`
  MODIFY `id_comida` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ejercicios`
--
ALTER TABLE `ejercicios`
  MODIFY `id_ejercicio` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `hardware_sesiones`
--
ALTER TABLE `hardware_sesiones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  MODIFY `id_ingrediente` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id_personal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promocion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `recetas`
--
ALTER TABLE `recetas`
  MODIFY `id_receta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `receta_ingredientes`
--
ALTER TABLE `receta_ingredientes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `recompensas`
--
ALTER TABLE `recompensas`
  MODIFY `id_recompensa` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `registros_fisicos`
--
ALTER TABLE `registros_fisicos`
  MODIFY `id_registro` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `registro_entrenamiento`
--
ALTER TABLE `registro_entrenamiento`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reportes`
--
ALTER TABLE `reportes`
  MODIFY `id_reporte` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  MODIFY `id_rutina` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rutina_ejercicios`
--
ALTER TABLE `rutina_ejercicios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sensor_huella_posiciones`
--
ALTER TABLE `sensor_huella_posiciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `strikes_reporte`
--
ALTER TABLE `strikes_reporte`
  MODIFY `id_strike` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  MODIFY `id_suscripcion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `suscriptores`
--
ALTER TABLE `suscriptores`
  MODIFY `id_suscriptor` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `tipos_suscripcion`
--
ALTER TABLE `tipos_suscripcion`
  MODIFY `id_tipo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `accesos`
--
ALTER TABLE `accesos`
  ADD CONSTRAINT `fk_acceso_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_acceso_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `avisos`
--
ALTER TABLE `avisos`
  ADD CONSTRAINT `fk_aviso_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `aviso_destinatarios`
--
ALTER TABLE `aviso_destinatarios`
  ADD CONSTRAINT `fk_avisodet_aviso` FOREIGN KEY (`id_aviso`) REFERENCES `avisos` (`id_aviso`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_avisodet_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `canjes`
--
ALTER TABLE `canjes`
  ADD CONSTRAINT `fk_canje_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_canje_recompensa` FOREIGN KEY (`id_recompensa`) REFERENCES `recompensas` (`id_recompensa`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_canje_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `chat_mensajes`
--
ALTER TABLE `chat_mensajes`
  ADD CONSTRAINT `fk_chat_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_chat_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `config_reportes_periodicos`
--
ALTER TABLE `config_reportes_periodicos`
  ADD CONSTRAINT `fk_configrep_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `dietas`
--
ALTER TABLE `dietas`
  ADD CONSTRAINT `fk_dieta_nutriologo` FOREIGN KEY (`id_nutriologo`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dieta_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `dieta_comidas`
--
ALTER TABLE `dieta_comidas`
  ADD CONSTRAINT `fk_comida_dieta` FOREIGN KEY (`id_dieta`) REFERENCES `dietas` (`id_dieta`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comida_receta` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id_receta`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `ejercicios`
--
ALTER TABLE `ejercicios`
  ADD CONSTRAINT `fk_ejercicio_personal` FOREIGN KEY (`creado_por`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  ADD CONSTRAINT `fk_ingrediente_personal` FOREIGN KEY (`creado_por`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `personal`
--
ALTER TABLE `personal`
  ADD CONSTRAINT `fk_personal_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD CONSTRAINT `fk_promo_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `recetas`
--
ALTER TABLE `recetas`
  ADD CONSTRAINT `fk_receta_personal` FOREIGN KEY (`creado_por`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `receta_ingredientes`
--
ALTER TABLE `receta_ingredientes`
  ADD CONSTRAINT `fk_recetaing_ingrediente` FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id_ingrediente`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recetaing_receta` FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id_receta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `recompensas`
--
ALTER TABLE `recompensas`
  ADD CONSTRAINT `fk_recompensa_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `registros_fisicos`
--
ALTER TABLE `registros_fisicos`
  ADD CONSTRAINT `fk_regfis_nutriologo` FOREIGN KEY (`id_nutriologo`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_regfis_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `registro_entrenamiento`
--
ALTER TABLE `registro_entrenamiento`
  ADD CONSTRAINT `fk_regentren_ejercicio` FOREIGN KEY (`id_rutina_ejercicio`) REFERENCES `rutina_ejercicios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_regentren_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD CONSTRAINT `fk_reporte_personal` FOREIGN KEY (`id_personal_reportado`) REFERENCES `personal` (`id_personal`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reporte_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reporte_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  ADD CONSTRAINT `fk_sumado_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sumado_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `rutinas`
--
ALTER TABLE `rutinas`
  ADD CONSTRAINT `fk_rutina_entrenador` FOREIGN KEY (`id_entrenador`) REFERENCES `personal` (`id_personal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rutina_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `rutina_ejercicios`
--
ALTER TABLE `rutina_ejercicios`
  ADD CONSTRAINT `fk_rutej_ejercicio` FOREIGN KEY (`id_ejercicio`) REFERENCES `ejercicios` (`id_ejercicio`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rutej_rutina` FOREIGN KEY (`id_rutina`) REFERENCES `rutinas` (`id_rutina`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `sensores`
--
ALTER TABLE `sensores`
  ADD CONSTRAINT `fk_sensor_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `sensor_huella_posiciones`
--
ALTER TABLE `sensor_huella_posiciones`
  ADD CONSTRAINT `fk_shp_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `strikes_reporte`
--
ALTER TABLE `strikes_reporte`
  ADD CONSTRAINT `fk_strike_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reportes` (`id_reporte`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  ADD CONSTRAINT `fk_sub_promo` FOREIGN KEY (`id_promocion`) REFERENCES `promociones` (`id_promocion`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sub_suscriptor` FOREIGN KEY (`id_suscriptor`) REFERENCES `suscriptores` (`id_suscriptor`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sub_tipo` FOREIGN KEY (`id_tipo`) REFERENCES `tipos_suscripcion` (`id_tipo`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `suscriptores`
--
ALTER TABLE `suscriptores`
  ADD CONSTRAINT `fk_suscriptor_sucursal` FOREIGN KEY (`id_sucursal_registro`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `tipos_suscripcion`
--
ALTER TABLE `tipos_suscripcion`
  ADD CONSTRAINT `fk_tipo_sub_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
