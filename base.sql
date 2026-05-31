-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 31-05-2026 a las 05:06:38
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
  `tipo_movimiento` enum('Entrada','Salida') DEFAULT NULL,
  `fecha_hora` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 'Axel Aguirre', 'Us3rM4st3rAxF', '$2b$10$R8UFTwHzJuv2qVNsdYstCObUtgWMWR0kFGXuxYl0BoCau1inJwHoe', '2026-03-04 01:17:40');

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
(84, 1, '💬 Cristian Alfonso Amezcua: Hola', '2026-05-29 03:48:54'),
(98, 1, '💬 Cristian Alfonso Amezcua: You\'re not my father', '2026-05-29 04:47:51'),
(99, 1, 'MAr', '2026-05-29 06:35:41'),
(100, 1, '💬 Cristian Alfonso Amezcua: NOOO', '2026-05-29 06:53:51'),
(101, 1, '💬 Cristian Alfonso Amezcua: Muñesco', '2026-05-29 06:59:00'),
(102, 1, '💬 Cristian Alfonso Amezcua: Hello there', '2026-05-29 07:00:29'),
(103, 1, '💬 Axel Adrian Aguirre: Ugu', '2026-05-29 13:52:26'),
(104, 1, '💬 Axel Adrian Aguirre: Mua??', '2026-05-29 13:52:42'),
(105, 1, '💬 Axel Adrian Aguirre: Oo', '2026-05-29 13:52:50'),
(106, 1, '💬 Axel Adrian Aguirre: Jotoo', '2026-05-29 13:53:05'),
(107, 1, 'Deja de tapar los baños sahureño', '2026-05-29 14:12:45'),
(108, 1, 'este va pa todos', '2026-05-29 14:13:00');

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
(144, 84, 11, 1),
(158, 98, 14, 1),
(159, 99, 11, 1),
(160, 100, 14, 1),
(161, 101, 17, 1),
(162, 102, 14, 1),
(163, 103, 17, 1),
(164, 104, 17, 1),
(165, 105, 17, 1),
(166, 106, 17, 1),
(167, 107, 14, 1),
(168, 108, 11, 0),
(169, 108, 14, 1),
(170, 108, 17, 1);

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
  `enviado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_respuesta` int(10) UNSIGNED DEFAULT NULL COMMENT 'FK al mensaje al que responde (para quotes)',
  `respuesta_contenido` text DEFAULT NULL COMMENT 'Copia del texto del mensaje citado (para mostrar aunque se borre)',
  `respuesta_enviado_por` enum('personal','suscriptor') DEFAULT NULL,
  `editado_en` timestamp NULL DEFAULT NULL COMMENT 'NULL si nunca fue editado',
  `borrado_para` enum('nadie','emisor','todos') NOT NULL DEFAULT 'nadie',
  `entregado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `chat_mensajes`
--

INSERT INTO `chat_mensajes` (`id_mensaje`, `id_personal`, `id_suscriptor`, `enviado_por`, `contenido`, `leido`, `enviado_en`, `id_respuesta`, `respuesta_contenido`, `respuesta_enviado_por`, `editado_en`, `borrado_para`, `entregado`) VALUES
(410, 11, 22, 'suscriptor', 'Hola', 1, '2026-05-29 03:48:54', NULL, NULL, NULL, NULL, 'nadie', 1),
(411, 11, 22, 'personal', 'HOLA', 1, '2026-05-29 03:49:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(412, 14, 22, 'personal', 'come with me to the dark side', 1, '2026-05-29 04:33:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(426, 14, 22, 'suscriptor', 'You\'re not my father', 1, '2026-05-29 04:47:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(427, 14, 22, 'personal', 'bye son', 1, '2026-05-29 04:49:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(428, 14, 22, 'suscriptor', 'NOOO', 1, '2026-05-29 06:53:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(429, 17, 22, 'personal', 'j oj', 1, '2026-05-29 06:57:54', NULL, NULL, NULL, NULL, 'nadie', 1),
(430, 17, 22, 'suscriptor', 'Muñesco', 1, '2026-05-29 06:59:00', NULL, NULL, NULL, NULL, 'nadie', 1),
(431, 14, 22, 'suscriptor', 'Hello there', 1, '2026-05-29 07:00:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(432, 17, 22, 'personal', 'joto', 1, '2026-05-29 13:39:07', NULL, NULL, NULL, NULL, 'nadie', 1),
(433, 17, 22, 'personal', 'de cagada', 1, '2026-05-29 13:39:08', NULL, NULL, NULL, NULL, 'nadie', 1),
(434, 17, 22, 'personal', 'a la verga', 1, '2026-05-29 13:39:09', NULL, NULL, NULL, NULL, 'nadie', 1),
(435, 17, 22, 'personal', 'muñesco maricon', 1, '2026-05-29 13:39:14', NULL, NULL, NULL, NULL, 'nadie', 1),
(436, 17, 25, 'suscriptor', 'Ugu', 1, '2026-05-29 13:52:25', NULL, NULL, NULL, NULL, 'nadie', 1),
(437, 17, 25, 'personal', 'nya', 1, '2026-05-29 13:52:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(438, 17, 25, 'suscriptor', 'Mua??', 1, '2026-05-29 13:52:42', NULL, NULL, NULL, NULL, 'nadie', 1),
(439, 17, 25, 'suscriptor', 'Oo', 1, '2026-05-29 13:52:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(440, 17, 25, 'suscriptor', 'Jotoo', 1, '2026-05-29 13:53:05', NULL, NULL, NULL, NULL, 'nadie', 1),
(441, 17, 25, 'personal', 'gay', 1, '2026-05-29 13:53:16', NULL, NULL, NULL, NULL, 'nadie', 1);

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
  `horas_strike1` smallint(5) UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Horas sin actividad para 1er strike',
  `horas_strike2` smallint(5) UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Horas adicionales para 2do strike',
  `horas_strike3` smallint(5) UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Horas adicionales para 3er strike',
  `ultimo_envio` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `proximo_envio` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Fecha calculada del pr?ximo informe'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `config_reportes_periodicos`
--

INSERT INTO `config_reportes_periodicos` (`id_config`, `id_sucursal`, `frecuencia_dias`, `frecuencia_tipo`, `valor`, `horas_strike1`, `horas_strike2`, `horas_strike3`, `ultimo_envio`, `proximo_envio`) VALUES
(1, 1, 1, 'dias', 1, 24, 24, 24, '2026-05-28 21:43:06', '2026-05-29 21:43:06');

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

--
-- Volcado de datos para la tabla `dietas`
--

INSERT INTO `dietas` (`id_dieta`, `id_suscriptor`, `id_nutriologo`, `enviada_app`, `creado_en`) VALUES
(19, 22, 14, 0, '2026-05-29 04:57:42');

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

--
-- Volcado de datos para la tabla `dieta_comidas`
--

INSERT INTO `dieta_comidas` (`id_comida`, `id_dieta`, `dia`, `orden_comida`, `descripcion`, `id_receta`, `calorias`, `notas`) VALUES
(79, 19, 1, 1, '📋 ensalada de frutas\n• Plátano: 200.00 g\n• Manzana: 200.00 g\n• Fresas: 200.00 g', 36, 346.00, NULL),
(80, 19, 1, 2, '📋 Filetes de res\n• Carne de res magra: 200.00 g\n• Arroz blanco crudo: 200.00 g\n• Espinaca cruda: 100.00 g\n• Jitomate: 100.00 g\n• Cebolla blanca: 100.00 g\n\n📋 ensalada\n• Aguacate: 100.00 g\n• Almendras: 100.00 g\n• Aceite de oliva extra virgen: 1.00 cda\n• Aceite de coco: 1.00 cda\n• Brócoli crudo: 100.00 g\n• Jitomate: 100.00 g\n• Calabacín (Zucchini): 100.00 g\n• Champiñones blancos: 100.00 g', 33, 2367.00, NULL),
(81, 19, 1, 3, '📋 pollo con arroz\n• Pechuga de pollo cruda: 100.00 g\n• Arroz blanco crudo: 100.00 g\n• Arroz integral crudo: 200.00 g', 34, 1220.00, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ejercicios`
--

CREATE TABLE `ejercicios` (
  `id_ejercicio` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `grupo_muscular` varchar(80) DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ejercicios`
--

INSERT INTO `ejercicios` (`id_ejercicio`, `nombre`, `grupo_muscular`, `imagen_url`, `creado_por`, `creado_en`) VALUES
(255, 'Press de banca plano con barra', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(256, 'Press de banca inclinado con barra', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(257, 'Press de banca declinado con barra', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(258, 'Aperturas planas con mancuernas', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(259, 'Aperturas inclinadas con mancuernas', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(260, 'Cruces en polea alta (Crossover)', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(261, 'Flexiones de brazos (Push-ups)', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(262, 'Fondos en paralelas (Enfoque pecho)', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(263, 'Press en máquina para pecho (Chest Press)', 'Pecho', NULL, 14, '2026-05-29 04:41:08'),
(264, 'Dominadas (Pull-ups)', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(265, 'Jalón al pecho con polea alta', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(266, 'Remo con barra (Bent-over row)', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(267, 'Remo con mancuerna a una mano', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(268, 'Remo sentado en polea baja', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(269, 'Remo en barra T', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(270, 'Pullover en polea alta con cuerda', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(271, 'Face pull en polea', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(272, 'Hiperextensiones en banco romano', 'Espalda', NULL, 14, '2026-05-29 04:41:08'),
(273, 'Sentadilla libre con barra', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(274, 'Sentadilla en máquina Smith', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(275, 'Prensa de piernas a 45 grados', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(276, 'Zancadas con mancuernas (Lunges)', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(277, 'Sentadilla Búlgara con mancuernas', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(278, 'Extensión de cuádriceps en máquina', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(279, 'Curl de isquiotibiales acostado', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(280, 'Curl de isquiotibiales sentado', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(281, 'Peso muerto rumano con barra (RDL)', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(282, 'Hip Thrust (Empuje de cadera) con barra', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(283, 'Elevación de talones de pie (Pantorrillas)', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(284, 'Elevación de talones sentado (Pantorrillas)', 'Piernas', NULL, 14, '2026-05-29 04:41:08'),
(285, 'Press militar con barra de pie', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(286, 'Press de hombros con mancuernas sentado', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(287, 'Press Arnold con mancuernas', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(288, 'Elevaciones laterales con mancuernas', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(289, 'Elevaciones frontales con disco o mancuernas', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(290, 'Pájaros con mancuernas (Delt. posterior)', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(291, 'Encogimientos de hombros para trapecio', 'Hombros', NULL, 14, '2026-05-29 04:41:08'),
(292, 'Curl de bíceps con barra recta', 'Bíceps', NULL, 14, '2026-05-29 04:41:08'),
(293, 'Curl de bíceps con barra EZ', 'Bíceps', NULL, 14, '2026-05-29 04:41:08'),
(294, 'Curl martillo con mancuernas', 'Bíceps', NULL, 14, '2026-05-29 04:41:08'),
(295, 'Curl concentrado con mancuerna', 'Bíceps', NULL, 14, '2026-05-29 04:41:08'),
(296, 'Extensión de tríceps en polea con cuerda', 'Tríceps', NULL, 14, '2026-05-29 04:41:08'),
(297, 'Press francés con barra EZ', 'Tríceps', NULL, 14, '2026-05-29 04:41:08'),
(298, 'Extensión copa de tríceps con mancuerna', 'Tríceps', NULL, 14, '2026-05-29 04:41:08'),
(299, 'Patada de tríceps con mancuerna', 'Tríceps', NULL, 14, '2026-05-29 04:41:08'),
(300, 'Fondos entre bancos para tríceps', 'Tríceps', NULL, 14, '2026-05-29 04:41:08'),
(301, 'Crunch abdominal en el suelo', 'Core', NULL, 14, '2026-05-29 04:41:08'),
(302, 'Plancha frontal (Plank)', 'Core', NULL, 14, '2026-05-29 04:41:08'),
(303, 'Elevación de piernas colgado en barra', 'Core', NULL, 14, '2026-05-29 04:41:08'),
(304, 'Giro ruso (Russian Twist) con disco', 'Core', NULL, 14, '2026-05-29 04:41:08');

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
(300, '9D332800', 'nfc', '', 0, 'pending', 'esperando_dispositivo', '2026-05-29 04:22:18', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ingredientes`
--

CREATE TABLE `ingredientes` (
  `id_ingrediente` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `unidad_medicion` varchar(50) NOT NULL,
  `creado_por` int(10) UNSIGNED NOT NULL,
  `cantidad_base` decimal(8,2) NOT NULL DEFAULT 100.00 COMMENT 'Cantidad de referencia para los macros (ej: 100 para gramos, 1 para piezas)',
  `kcal_base` decimal(8,2) NOT NULL DEFAULT 0.00 COMMENT 'Calor?as por cantidad_base de unidad',
  `proteinas_base` decimal(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Prote?nas (g) por cantidad_base de unidad',
  `grasas_base` decimal(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Grasas (g) por cantidad_base de unidad',
  `carbohidratos_base` decimal(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Carbohidratos (g) por cantidad_base de unidad'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ingredientes`
--

INSERT INTO `ingredientes` (`id_ingrediente`, `nombre`, `unidad_medicion`, `creado_por`, `cantidad_base`, `kcal_base`, `proteinas_base`, `grasas_base`, `carbohidratos_base`) VALUES
(239, 'Pechuga de pollo cruda', 'g', 14, 100.00, 120.00, 22.50, 2.60, 0.00),
(240, 'Carne de res magra', 'g', 14, 100.00, 250.00, 26.00, 15.00, 0.00),
(241, 'Salmón fresco', 'g', 14, 100.00, 208.00, 20.00, 13.00, 0.00),
(242, 'Atún en agua escurrido', 'g', 14, 100.00, 116.00, 26.00, 1.00, 0.00),
(243, 'Clara de huevo', 'g', 14, 100.00, 52.00, 11.00, 0.20, 0.70),
(244, 'Huevo entero', 'pz', 14, 1.00, 72.00, 6.30, 4.80, 0.40),
(245, 'Tofu firme', 'g', 14, 100.00, 144.00, 15.00, 8.00, 3.00),
(246, 'Lomo de cerdo magro', 'g', 14, 100.00, 143.00, 26.00, 3.50, 0.00),
(247, 'Camarón crudo', 'g', 14, 100.00, 85.00, 20.00, 0.50, 0.00),
(248, 'Proteína Whey en polvo', 'g', 14, 100.00, 380.00, 80.00, 4.00, 6.00),
(249, 'Avena en hojuelas', 'g', 14, 100.00, 389.00, 16.90, 6.90, 66.30),
(250, 'Arroz blanco crudo', 'g', 14, 100.00, 360.00, 7.00, 0.60, 80.00),
(251, 'Arroz integral crudo', 'g', 14, 100.00, 370.00, 8.00, 3.00, 77.00),
(252, 'Pasta de trigo cruda', 'g', 14, 100.00, 371.00, 13.00, 1.50, 74.00),
(253, 'Papa blanca cruda', 'g', 14, 100.00, 77.00, 2.00, 0.10, 17.00),
(254, 'Camote crudo', 'g', 14, 100.00, 86.00, 1.60, 0.10, 20.00),
(255, 'Quinoa cruda', 'g', 14, 100.00, 368.00, 14.00, 6.00, 64.00),
(256, 'Tortilla de maíz', 'pz', 14, 1.00, 52.00, 1.40, 0.50, 10.70),
(257, 'Pan integral de caja', 'rebanada', 14, 1.00, 69.00, 3.60, 1.10, 11.80),
(258, 'Lentejas crudas', 'g', 14, 100.00, 353.00, 25.00, 1.00, 60.00),
(259, 'Aguacate', 'g', 14, 100.00, 160.00, 2.00, 14.70, 8.50),
(260, 'Almendras', 'g', 14, 100.00, 579.00, 21.00, 50.00, 22.00),
(261, 'Nueces', 'g', 14, 100.00, 654.00, 15.00, 65.00, 14.00),
(262, 'Crema de cacahuate natural', 'g', 14, 100.00, 588.00, 25.00, 50.00, 20.00),
(263, 'Aceite de oliva extra virgen', 'cda', 14, 1.00, 119.00, 0.00, 13.50, 0.00),
(264, 'Aceite de coco', 'cda', 14, 1.00, 117.00, 0.00, 13.60, 0.00),
(265, 'Mantequilla', 'g', 14, 100.00, 717.00, 0.80, 81.00, 0.10),
(266, 'Semillas de chía', 'g', 14, 100.00, 486.00, 16.50, 30.70, 42.10),
(267, 'Mayonesa regular', 'cda', 14, 1.00, 94.00, 0.10, 10.30, 0.10),
(268, 'Chocolate amargo 70%', 'g', 14, 100.00, 598.00, 7.80, 42.60, 45.90),
(269, 'Brócoli crudo', 'g', 14, 100.00, 34.00, 2.80, 0.40, 6.60),
(270, 'Espinaca cruda', 'g', 14, 100.00, 23.00, 2.90, 0.40, 3.60),
(271, 'Jitomate', 'g', 14, 100.00, 18.00, 0.90, 0.20, 3.90),
(272, 'Cebolla blanca', 'g', 14, 100.00, 40.00, 1.10, 0.10, 9.30),
(273, 'Plátano', 'g', 14, 100.00, 89.00, 1.10, 0.30, 22.80),
(274, 'Manzana', 'g', 14, 100.00, 52.00, 0.30, 0.20, 13.80),
(275, 'Fresas', 'g', 14, 100.00, 32.00, 0.70, 0.30, 7.70),
(276, 'Zanahoria cruda', 'g', 14, 100.00, 41.00, 0.90, 0.20, 9.60),
(277, 'Calabacín (Zucchini)', 'g', 14, 100.00, 17.00, 1.20, 0.30, 3.10),
(278, 'Champiñones blancos', 'g', 14, 100.00, 22.00, 3.10, 0.30, 3.30),
(279, 'Leche entera', 'ml', 14, 100.00, 61.00, 3.20, 3.30, 4.70),
(280, 'Leche descremada', 'ml', 14, 100.00, 34.00, 3.40, 0.20, 4.90),
(281, 'Yogurt griego natural sin azúcar', 'g', 14, 100.00, 59.00, 10.00, 0.40, 3.60),
(282, 'Queso Panela', 'g', 14, 100.00, 275.00, 20.00, 18.00, 6.00),
(283, 'Queso Oaxaca', 'g', 14, 100.00, 316.00, 22.00, 24.00, 0.50),
(284, 'Queso Cottage', 'g', 14, 100.00, 98.00, 11.00, 4.50, 2.70),
(285, 'Frijoles negros cocidos', 'g', 14, 100.00, 132.00, 8.90, 0.50, 23.70),
(286, 'Garbanzos cocidos', 'g', 14, 100.00, 164.00, 8.90, 2.60, 27.40),
(287, 'Leche de almendras sin azúcar', 'ml', 14, 100.00, 15.00, 0.60, 1.20, 0.60),
(288, 'Miel de abeja', 'cda', 14, 1.00, 64.00, 0.10, 0.00, 17.30);

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
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `fcm_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `personal`
--

INSERT INTO `personal` (`id_personal`, `id_sucursal`, `nombres`, `apellido_paterno`, `apellido_materno`, `edad`, `sexo`, `puesto`, `usuario`, `password_hash`, `foto_url`, `activo`, `creado_en`, `fcm_token`) VALUES
(11, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', 20, 'M', 'entrenador_nutriologo', 'Cristian', '$2b$10$mjRGxV55VEZiT9ioqtyxguecY86QokDEo/vOghn.vWZlrfcHRl31q', '/uploads/personal/personal_1780025616507.jpeg', 1, '2026-05-29 03:33:36', NULL),
(14, 1, 'Darth', 'Vader', NULL, 20, 'M', 'entrenador_nutriologo', 'Alfonso', '$2b$10$BS4Pk8sowf8kpIcXz9VWT.5G5ErfWY1tuXbE64rAmlQMQiXEz9LcK', '/uploads/personal/personal_1780030965996.jpg', 1, '2026-05-29 04:33:13', NULL),
(16, 16, 'Staff', 'Staff', NULL, 40, 'F', 'staff', 'Staff', '$2b$10$0bvM0eaAwkXxzHWnhDN7Su1k7ejrDDcVCBIBF0V1vzKv9uVuapY22', NULL, 1, '2026-05-29 06:34:25', NULL),
(17, 1, 'Axel Adrian', 'Aguirre', 'Casas', 19, 'M', 'entrenador_nutriologo', 'Axel', '$2b$10$2ShuTSSMAkhUL1X/3/3i3Oho1IelbQ967NURqsN7h.kR9v/lR7XjK', '/uploads/personal/personal_1780037673823.jpeg', 1, '2026-05-29 06:54:34', 'fr_ChE0yxTVLvPb1vwV1KB:APA91bGfROIDa7UasAihq2Sa3GmZI_fF3VwHsf0D9bGnLplKnfrtTncJc9IXUONcSwibiOVA69-66zJbp5p4AJWzpMsPZhLKLW5JybzfVMKWsej1X-jQF-4');

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
(3, 1, 'Sesiones promo', 'sesiones de nutriologo y entrenador', 0, 300.00, 0, 0, 1),
(11, 16, 'Pruebas', 'Prueba', 200, 150.00, 10, 10, 1),
(12, 1, 'Entrenamiento', 'Entrena Duro', 0, 20.00, 0, 3, 1);

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
  `carbohidratos_g` decimal(6,2) DEFAULT NULL COMMENT 'Carbohidratos totales calculados autom?ticamente de los ingredientes',
  `creado_por` int(10) UNSIGNED NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `recetas`
--

INSERT INTO `recetas` (`id_receta`, `nombre`, `imagen_url`, `proteinas_g`, `calorias`, `grasas_g`, `carbohidratos_g`, `creado_por`, `creado_en`) VALUES
(33, 'ensalada', NULL, 31.00, 1066.00, 93.00, 47.40, 14, '2026-05-29 04:49:20'),
(34, 'pollo con arroz', NULL, 45.50, 1220.00, 9.20, 234.00, 14, '2026-05-29 04:53:29'),
(35, 'Filetes de res', NULL, 70.90, 1301.00, 31.90, 176.80, 14, '2026-05-29 04:54:35'),
(36, 'ensalada de frutas', NULL, 4.20, 346.00, 1.60, 88.60, 14, '2026-05-29 04:56:56');

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

--
-- Volcado de datos para la tabla `receta_ingredientes`
--

INSERT INTO `receta_ingredientes` (`id`, `id_receta`, `id_ingrediente`, `cantidad`) VALUES
(151, 33, 259, 100.00),
(152, 33, 260, 100.00),
(153, 33, 264, 1.00),
(154, 33, 263, 1.00),
(155, 33, 277, 100.00),
(156, 33, 278, 100.00),
(157, 33, 271, 100.00),
(158, 33, 269, 100.00),
(159, 34, 251, 200.00),
(160, 34, 250, 100.00),
(161, 34, 239, 100.00),
(166, 35, 240, 200.00),
(167, 35, 270, 100.00),
(168, 35, 271, 100.00),
(169, 35, 272, 100.00),
(170, 35, 250, 200.00),
(171, 36, 275, 200.00),
(172, 36, 274, 200.00),
(173, 36, 273, 200.00);

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
  `registrado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha` date NOT NULL
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
  `reenviado_sucursal` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `resuelto_en` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reportes`
--

INSERT INTO `reportes` (`id_reporte`, `id_suscriptor`, `id_sucursal`, `categoria`, `descripcion`, `foto_url`, `es_privado`, `id_personal_reportado`, `sobre_atencion_previa`, `estado`, `num_strikes`, `reenviado_sucursal`, `creado_en`, `resuelto_en`) VALUES
(28, 22, 1, 'Maquina_Dañada', 'no sirve la polea 4', '/uploads/reportes/rep_1780038245117.jpg', 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-29 07:04:05', '0000-00-00 00:00:00'),
(29, 22, 1, 'Maquina_Dañada', 'La caminadora número 3 tiene la banda suelta y hace un ruido extraño. Se reportó pero sigue igual.', NULL, 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-26 07:08:11', '0000-00-00 00:00:00'),
(30, 22, 1, 'Problema_Limpieza', 'Falta papel higiénico en los baños y hay charcos de agua en el piso del vestidor.', NULL, 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-28 06:10:13', '0000-00-00 00:00:00'),
(31, 22, 1, 'Reporte_Personal', 'El entrenador agendado no se presentó a mi sesión y no he recibido respuesta de administración desde hace días.', NULL, 0, NULL, NULL, 'Abierto', 3, 0, '2026-05-26 04:14:19', '0000-00-00 00:00:00');

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

--
-- Volcado de datos para la tabla `reporte_sumados`
--

INSERT INTO `reporte_sumados` (`id`, `id_reporte`, `id_suscriptor`, `sumado_en`) VALUES
(11, 28, 22, '2026-05-29 07:04:22'),
(12, 29, 22, '2026-05-29 07:09:41'),
(13, 30, 22, '2026-05-29 07:10:50'),
(14, 31, 22, '2026-05-29 07:15:29');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutinas`
--

CREATE TABLE `rutinas` (
  `id_rutina` int(10) UNSIGNED NOT NULL,
  `id_suscriptor` int(10) UNSIGNED NOT NULL,
  `id_entrenador` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `notas_pdf` text DEFAULT NULL,
  `enviada_app` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rutinas`
--

INSERT INTO `rutinas` (`id_rutina`, `id_suscriptor`, `id_entrenador`, `nombre`, `notas_pdf`, `enviada_app`, `creado_en`) VALUES
(21, 22, 14, NULL, NULL, 0, '2026-05-29 04:42:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutina_ejercicios`
--

CREATE TABLE `rutina_ejercicios` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_rutina` int(10) UNSIGNED NOT NULL,
  `id_ejercicio` int(10) UNSIGNED NOT NULL,
  `orden` smallint(5) UNSIGNED NOT NULL,
  `series` tinyint(3) UNSIGNED NOT NULL,
  `repeticiones` tinyint(3) UNSIGNED NOT NULL,
  `descanso_seg` int(10) UNSIGNED DEFAULT NULL,
  `peso_kg` decimal(6,2) DEFAULT NULL,
  `descripcion_tecnica` text DEFAULT NULL,
  `nombre_bloque` varchar(80) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `rutina_ejercicios`
--

INSERT INTO `rutina_ejercicios` (`id`, `id_rutina`, `id_ejercicio`, `orden`, `series`, `repeticiones`, `descanso_seg`, `peso_kg`, `descripcion_tecnica`, `nombre_bloque`) VALUES
(88, 21, 259, 1, 3, 10, 60, NULL, NULL, 'Pecho'),
(89, 21, 260, 2, 3, 10, 60, NULL, NULL, 'Pecho'),
(90, 21, 264, 101, 3, 10, 60, NULL, NULL, 'Espalda'),
(91, 21, 291, 102, 3, 10, 60, NULL, NULL, 'Espalda'),
(92, 21, 265, 103, 3, 10, 60, NULL, NULL, 'Espalda'),
(93, 21, 278, 201, 3, 10, 60, NULL, NULL, 'Piernas'),
(94, 21, 277, 202, 3, 10, 60, NULL, NULL, 'Piernas'),
(95, 21, 273, 203, 3, 10, 60, NULL, NULL, 'Piernas');

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

--
-- Volcado de datos para la tabla `strikes_reporte`
--

INSERT INTO `strikes_reporte` (`id_strike`, `id_reporte`, `nivel`, `notificados`, `generado_en`) VALUES
(20, 30, 1, '{\"origen\": \"Inyección manual (DBA)\", \"estado\": \"Strike 1 simulado\"}', '2026-05-29 06:10:13'),
(21, 31, 1, '{\"origen\": \"Inyección manual (DBA)\", \"estado\": \"Strike 1 simulado\"}', '2026-05-27 04:14:19'),
(22, 31, 2, '{\"origen\": \"Inyección manual (DBA)\", \"estado\": \"Strike 2 simulado\"}', '2026-05-28 04:14:19'),
(23, 31, 3, '{\"origen\": \"Inyección manual (DBA)\", \"estado\": \"Strike 3 simulado\"}', '2026-05-29 04:14:19'),
(24, 29, 1, '{\"personal\":[{\"id\":11,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":14,\"nombre\":\"Darth Vader\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":17,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-29 07:51:22'),
(25, 28, 1, '{\"personal\":[{\"id\":11,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":14,\"nombre\":\"Darth Vader\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":17,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-31 04:28:27');

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
  `correo` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `capacidad_maxima` int(10) UNSIGNED NOT NULL DEFAULT 50,
  `password_enc` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sucursales`
--

INSERT INTO `sucursales` (`id_sucursal`, `nombre`, `direccion`, `codigo_postal`, `usuario`, `password_hash`, `activa`, `creado_en`, `capacidad_maxima`, `password_enc`) VALUES
(1, 'Sucursal Central AXF', 'zenith norte', '45157', 'admin', '$2b$10$4JvT7CqDeZRBiIihsntUX.oulFzPfAyXR71pkVRqrkZNLmN4u.rS6', 1, '2026-03-02 20:09:37', 80, 'rNkwJHmtdpjNPNw3ykGJPcRuY/LiVK8clLqyzjuSBbnNFGzJ6g=='),
(16, 'Prueba', 'Pruebame esta', '45157', 'Prueba', '$2b$10$ZjCk91cDfCpEhBvU0G5d6OOD7iYcZ5xCYTXpdDy6MWr.3FVjFMWpq', 1, '2026-05-29 06:17:38', 50, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursal_aforo`
--

CREATE TABLE `sucursal_aforo` (
  `id_sucursal` int(10) UNSIGNED NOT NULL,
  `personas_dentro` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sucursal_aforo`
--

INSERT INTO `sucursal_aforo` (`id_sucursal`, `personas_dentro`, `actualizado_en`) VALUES
(1, 35, '2026-05-14 13:47:43');

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
  `paypal_order_id` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscripciones`
--

INSERT INTO `suscripciones` (`id_suscripcion`, `id_suscriptor`, `id_tipo`, `id_promocion`, `fecha_inicio`, `fecha_fin`, `sesiones_nutriologo_restantes`, `sesiones_entrenador_restantes`, `estado`, `paypal_order_id`, `creado_en`) VALUES
(52, 22, 6, NULL, '2026-05-29', '2027-05-28', 9, 9, 'Inactiva', NULL, '2026-05-29 03:43:37'),
(53, 25, NULL, NULL, '2026-05-29', '2026-06-27', 2, 3, 'Activa', NULL, '2026-05-29 13:51:44'),
(54, 22, NULL, NULL, '2027-05-29', '2027-06-27', 2, 3, 'Inactiva', NULL, '2026-05-29 14:02:09'),
(55, 22, NULL, 12, '2026-05-29', '2026-05-29', 0, 3, 'Inactiva', NULL, '2026-05-29 14:08:54'),
(56, 22, NULL, 12, '2026-05-29', '2026-05-29', 0, 3, 'Activa', NULL, '2026-05-29 14:09:35'),
(57, 22, NULL, 12, '2026-05-31', '2026-05-31', 0, 3, 'Inactiva', NULL, '2026-05-31 04:29:02'),
(58, 22, NULL, 3, '2026-05-31', '2026-05-31', 0, 0, 'Activa', NULL, '2026-05-31 05:02:22');

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
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `fcm_token` varchar(255) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscriptores`
--

INSERT INTO `suscriptores` (`id_suscriptor`, `id_sucursal_registro`, `nombres`, `apellido_paterno`, `apellido_materno`, `fecha_nacimiento`, `sexo`, `direccion`, `codigo_postal`, `telefono`, `correo`, `password_hash`, `nfc_uid`, `huella_template`, `puntos`, `racha_dias`, `dias_descanso_semana`, `terminos_aceptados`, `activo`, `creado_en`, `fcm_token`, `foto_url`) VALUES
(22, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', '2006-12-31', 'M', 'Andador 17 poniente esquina con francisco mujica', '45157', '3323311381', 'alfonsoamezcua31@gmail.com', '$2b$12$03NnqUz.lylSTyEulQGyZOlj7/JUF5x7tL4vR3Pq3C/dVglWq8RDu', NULL, NULL, 0, 0, 2, 1, 1, '2026-05-29 03:41:23', NULL, '/uploads/suscriptores/sus_1780026082881.jpeg'),
(25, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-01-20', 'M', 'paseo de las misiones 1585, 4ª', '45130', '3317488529', 'axel@gmail.com', '$2b$12$M/OSZX.MZTa1EckAUnDgCedXJtijW.2sh9/Q5nT8sGckZMQaixsgi', NULL, NULL, 0, 0, 0, 1, 1, '2026-05-29 13:51:29', NULL, '/uploads/suscriptores/sus_1780062688753.jpeg');

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
(6, 1, 'Anual', 365, 4000.00, 10, 10, 1),
(12, 1, 'Trimestral', 90, 900.00, 2, 3, 1),
(13, 1, 'Mensual', 30, 300.00, 3, 3, 1);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_receta_macros`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_receta_macros` (
`id_receta` int(10) unsigned
,`id_ingrediente` int(10) unsigned
,`nombre_ingrediente` varchar(150)
,`unidad_medicion` varchar(50)
,`cantidad_base` decimal(8,2)
,`cantidad_usada` decimal(8,2)
,`factor` decimal(14,6)
,`kcal` decimal(17,2)
,`proteinas_g` decimal(15,2)
,`grasas_g` decimal(15,2)
,`carbohidratos_g` decimal(15,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_receta_totales`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_receta_totales` (
`id_receta` int(10) unsigned
,`total_kcal` decimal(39,2)
,`total_proteinas_g` decimal(37,2)
,`total_grasas_g` decimal(37,2)
,`total_carbohidratos_g` decimal(37,2)
);

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
  ADD KEY `fk_chat_suscriptor` (`id_suscriptor`),
  ADD KEY `idx_chat_noread` (`id_personal`,`id_suscriptor`,`enviado_por`,`leido`);

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
  ADD UNIQUE KEY `uq_registro_serie_fecha` (`id_rutina_ejercicio`,`id_suscriptor`,`num_serie`,`fecha`),
  ADD UNIQUE KEY `uq_serie_fecha` (`id_rutina_ejercicio`,`id_suscriptor`,`num_serie`,`fecha`),
  ADD UNIQUE KEY `uq_registro_serie` (`id_rutina_ejercicio`,`num_serie`,`fecha`),
  ADD KEY `fk_regentren_suscriptor` (`id_suscriptor`);

--
-- Indices de la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD PRIMARY KEY (`id_reporte`),
  ADD KEY `idx_reporte_sucursal_estado` (`id_sucursal`,`estado`),
  ADD KEY `fk_reporte_suscriptor` (`id_suscriptor`),
  ADD KEY `fk_reporte_personal` (`id_personal_reportado`),
  ADD KEY `idx_reportes_strike_scan` (`estado`,`num_strikes`,`creado_en`),
  ADD KEY `idx_sucursal_estado` (`id_sucursal`,`estado`),
  ADD KEY `idx_suscriptor` (`id_suscriptor`),
  ADD KEY `idx_personal_reportado` (`id_personal_reportado`);

--
-- Indices de la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reporte_suscriptor` (`id_reporte`,`id_suscriptor`),
  ADD KEY `fk_sumado_suscriptor` (`id_suscriptor`),
  ADD KEY `idx_reporte_suscriptor` (`id_reporte`,`id_suscriptor`);

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
  ADD KEY `fk_strike_reporte` (`id_reporte`),
  ADD KEY `idx_strike_unico` (`id_reporte`,`nivel`),
  ADD KEY `idx_reporte_nivel` (`id_reporte`,`nivel`);

--
-- Indices de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD PRIMARY KEY (`id_sucursal`),
  ADD UNIQUE KEY `uq_sucursal_usuario` (`usuario`);

--
-- Indices de la tabla `sucursal_aforo`
--
ALTER TABLE `sucursal_aforo`
  ADD PRIMARY KEY (`id_sucursal`);

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
  MODIFY `id_acceso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=88;

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `id_admin` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `avisos`
--
ALTER TABLE `avisos`
  MODIFY `id_aviso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT de la tabla `aviso_destinatarios`
--
ALTER TABLE `aviso_destinatarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=171;

--
-- AUTO_INCREMENT de la tabla `canjes`
--
ALTER TABLE `canjes`
  MODIFY `id_canje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `chat_mensajes`
--
ALTER TABLE `chat_mensajes`
  MODIFY `id_mensaje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=442;

--
-- AUTO_INCREMENT de la tabla `config_reportes_periodicos`
--
ALTER TABLE `config_reportes_periodicos`
  MODIFY `id_config` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT de la tabla `dietas`
--
ALTER TABLE `dietas`
  MODIFY `id_dieta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `dieta_comidas`
--
ALTER TABLE `dieta_comidas`
  MODIFY `id_comida` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT de la tabla `ejercicios`
--
ALTER TABLE `ejercicios`
  MODIFY `id_ejercicio` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=305;

--
-- AUTO_INCREMENT de la tabla `hardware_sesiones`
--
ALTER TABLE `hardware_sesiones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=301;

--
-- AUTO_INCREMENT de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  MODIFY `id_ingrediente` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=290;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id_personal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promocion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `recetas`
--
ALTER TABLE `recetas`
  MODIFY `id_receta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de la tabla `receta_ingredientes`
--
ALTER TABLE `receta_ingredientes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=174;

--
-- AUTO_INCREMENT de la tabla `recompensas`
--
ALTER TABLE `recompensas`
  MODIFY `id_recompensa` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `registros_fisicos`
--
ALTER TABLE `registros_fisicos`
  MODIFY `id_registro` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `registro_entrenamiento`
--
ALTER TABLE `registro_entrenamiento`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT de la tabla `reportes`
--
ALTER TABLE `reportes`
  MODIFY `id_reporte` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  MODIFY `id_rutina` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `rutina_ejercicios`
--
ALTER TABLE `rutina_ejercicios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT de la tabla `sensor_huella_posiciones`
--
ALTER TABLE `sensor_huella_posiciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `strikes_reporte`
--
ALTER TABLE `strikes_reporte`
  MODIFY `id_strike` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  MODIFY `id_suscripcion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT de la tabla `suscriptores`
--
ALTER TABLE `suscriptores`
  MODIFY `id_suscriptor` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `tipos_suscripcion`
--
ALTER TABLE `tipos_suscripcion`
  MODIFY `id_tipo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_receta_macros`
--
DROP TABLE IF EXISTS `v_receta_macros`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u544003664_axf`@`%` SQL SECURITY DEFINER VIEW `v_receta_macros`  AS SELECT `ri`.`id_receta` AS `id_receta`, `ri`.`id_ingrediente` AS `id_ingrediente`, `i`.`nombre` AS `nombre_ingrediente`, `i`.`unidad_medicion` AS `unidad_medicion`, `i`.`cantidad_base` AS `cantidad_base`, `ri`.`cantidad` AS `cantidad_usada`, round(`ri`.`cantidad` / `i`.`cantidad_base`,6) AS `factor`, round(`i`.`kcal_base` * (`ri`.`cantidad` / `i`.`cantidad_base`),2) AS `kcal`, round(`i`.`proteinas_base` * (`ri`.`cantidad` / `i`.`cantidad_base`),2) AS `proteinas_g`, round(`i`.`grasas_base` * (`ri`.`cantidad` / `i`.`cantidad_base`),2) AS `grasas_g`, round(`i`.`carbohidratos_base` * (`ri`.`cantidad` / `i`.`cantidad_base`),2) AS `carbohidratos_g` FROM (`receta_ingredientes` `ri` join `ingredientes` `i` on(`i`.`id_ingrediente` = `ri`.`id_ingrediente`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_receta_totales`
--
DROP TABLE IF EXISTS `v_receta_totales`;

CREATE ALGORITHM=UNDEFINED DEFINER=`u544003664_axf`@`%` SQL SECURITY DEFINER VIEW `v_receta_totales`  AS SELECT `v_receta_macros`.`id_receta` AS `id_receta`, round(sum(`v_receta_macros`.`kcal`),2) AS `total_kcal`, round(sum(`v_receta_macros`.`proteinas_g`),2) AS `total_proteinas_g`, round(sum(`v_receta_macros`.`grasas_g`),2) AS `total_grasas_g`, round(sum(`v_receta_macros`.`carbohidratos_g`),2) AS `total_carbohidratos_g` FROM `v_receta_macros` GROUP BY `v_receta_macros`.`id_receta` ;

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
-- Filtros para la tabla `sucursal_aforo`
--
ALTER TABLE `sucursal_aforo`
  ADD CONSTRAINT `fk_aforo_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON DELETE CASCADE;

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
