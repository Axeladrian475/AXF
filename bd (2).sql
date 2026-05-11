-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 11-05-2026 a las 00:24:11
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

--
-- Volcado de datos para la tabla `accesos`
--

INSERT INTO `accesos` (`id_acceso`, `id_suscriptor`, `id_sucursal`, `metodo`, `resultado`, `tipo_movimiento`, `fecha_hora`) VALUES
(1, 7, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-03-24 01:17:30'),
(2, 7, 1, 'Huella', 'Denegado_Sin_Sub', NULL, '2026-03-24 01:18:25'),
(3, 7, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-03-24 02:31:11'),
(4, 7, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-03-28 04:57:52'),
(5, 8, 1, 'NFC', 'Permitido', NULL, '2026-03-28 05:00:56'),
(6, 8, 1, 'NFC', 'Permitido', NULL, '2026-03-28 05:01:06'),
(7, 7, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-03-28 05:03:18'),
(8, 8, 1, 'NFC', 'Permitido', NULL, '2026-03-28 05:04:30'),
(9, 10, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-03-28 05:09:07'),
(14, 15, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-07 22:38:03'),
(15, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:39:09'),
(16, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 22:39:29'),
(17, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:40:04'),
(18, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 22:40:05'),
(19, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:41:08'),
(20, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 22:41:18'),
(21, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:41:25'),
(22, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 22:41:53'),
(23, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:41:54'),
(24, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 22:42:49'),
(25, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 22:54:57'),
(26, 10, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-07 22:55:58'),
(27, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 23:19:01'),
(28, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-07 23:19:06'),
(29, 10, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-07 23:19:14'),
(30, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-07 23:19:17'),
(31, 15, 1, 'NFC', 'Permitido', NULL, '2026-05-08 05:02:14'),
(32, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-08 13:52:12'),
(33, 15, 1, 'NFC', 'Permitido', 'Salida', '2026-05-08 13:52:39'),
(34, 10, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-08 13:52:52'),
(35, 8, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-08 13:53:29'),
(36, 7, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-08 13:53:37'),
(37, 17, 1, 'NFC', 'Denegado_Sin_Sub', NULL, '2026-05-08 14:07:16'),
(38, 17, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-08 14:08:24'),
(39, 15, 1, 'NFC', 'Permitido', 'Entrada', '2026-05-08 14:08:39'),
(40, 17, 1, 'NFC', 'Permitido', 'Salida', '2026-05-08 14:08:51');

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
(8, 1, 'oña muñaño', '2026-03-13 14:11:08'),
(9, 1, 'hola', '2026-03-28 05:58:11'),
(10, 1, 'hola', '2026-04-06 04:48:26'),
(11, 1, 'prueba 1', '2026-04-06 05:34:41'),
(12, 1, 'prueba 2', '2026-04-06 05:49:48'),
(13, 1, 'Si ven esto es para informar que Axel es puto', '2026-04-06 05:52:42'),
(14, 1, 'poncho esta mamando vergas, cuidadoo', '2026-04-07 05:25:10'),
(15, 1, 'hola aañaa', '2026-04-07 08:09:06'),
(16, 1, 'asdad', '2026-04-07 08:13:49'),
(17, 1, 'año', '2026-04-07 08:21:15'),
(18, 1, 'prueba 1', '2026-04-08 05:28:27'),
(19, 1, '💬 Axel Adrian Aguirre: H', '2026-04-17 04:35:08'),
(20, 1, '💬 Axel Adrian Aguirre: K', '2026-04-17 04:37:22'),
(21, 1, '💬 Axel Adrian Aguirre: Oki', '2026-04-17 04:39:20'),
(22, 1, '💬 Axel Adrian Aguirre: Tu tampoco te la jales con mis fotos we', '2026-04-17 04:40:46'),
(23, 1, '💬 Axel Adrian Aguirre: Hola tilingolilingo', '2026-04-17 14:34:07'),
(24, 1, '💬 Axel Adrian Aguirre: Hh', '2026-04-17 14:34:33'),
(25, 1, '💬 Axel Adrian Aguirre: Marica de cagafa\nMarica', '2026-04-24 04:20:28'),
(26, 1, '💬 Axel Adrian Aguirre: Asdaasdasd', '2026-04-24 04:21:06'),
(27, 1, '💬 Axel Adrian Aguirre: Joto de cagadaaaa', '2026-04-24 04:21:31'),
(28, 1, '💬 Axel Adrian Aguirre: mueo', '2026-04-28 04:53:18'),
(29, 1, '💬 Axel Adrian Aguirre: Joto', '2026-04-28 04:53:31'),
(30, 1, '💬 Axel Adrian Aguirre: joot', '2026-04-28 05:45:37'),
(31, 1, '💬 Axel Adrian Aguirre: the amount', '2026-05-02 05:47:30');

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
(1, 1, 1, 1),
(2, 1, 2, 1),
(3, 1, 3, 0),
(4, 1, 4, 0),
(5, 2, 1, 1),
(6, 2, 2, 1),
(7, 2, 3, 0),
(8, 2, 4, 0),
(9, 3, 1, 1),
(10, 3, 2, 1),
(11, 3, 3, 0),
(12, 3, 4, 0),
(13, 4, 1, 1),
(14, 4, 2, 1),
(15, 4, 3, 0),
(16, 5, 1, 1),
(17, 5, 2, 1),
(18, 5, 4, 0),
(19, 6, 1, 1),
(20, 6, 2, 1),
(21, 6, 3, 0),
(22, 6, 4, 0),
(23, 7, 1, 1),
(24, 7, 2, 1),
(25, 7, 3, 0),
(26, 7, 4, 0),
(27, 8, 1, 1),
(28, 8, 2, 1),
(29, 8, 3, 0),
(30, 8, 4, 0),
(31, 8, 8, 1),
(32, 9, 1, 1),
(33, 9, 2, 1),
(34, 9, 3, 0),
(35, 9, 8, 1),
(36, 10, 1, 1),
(37, 10, 2, 1),
(38, 10, 3, 0),
(39, 10, 8, 1),
(40, 11, 1, 1),
(41, 11, 2, 1),
(42, 11, 3, 0),
(43, 11, 4, 0),
(44, 11, 8, 1),
(45, 12, 1, 1),
(46, 12, 2, 1),
(47, 12, 3, 0),
(48, 12, 4, 0),
(49, 12, 8, 1),
(50, 13, 1, 1),
(51, 13, 2, 1),
(52, 13, 3, 0),
(53, 13, 4, 0),
(54, 13, 8, 1),
(55, 14, 1, 1),
(56, 14, 2, 1),
(57, 14, 3, 0),
(58, 14, 4, 0),
(59, 14, 8, 1),
(60, 15, 1, 1),
(61, 15, 2, 1),
(62, 15, 3, 0),
(63, 15, 4, 0),
(64, 15, 8, 1),
(65, 16, 1, 1),
(66, 16, 2, 1),
(67, 16, 3, 0),
(68, 16, 4, 0),
(69, 16, 8, 1),
(70, 17, 1, 1),
(71, 17, 2, 1),
(72, 17, 4, 0),
(73, 17, 8, 1),
(74, 18, 1, 1),
(75, 18, 2, 1),
(76, 18, 3, 0),
(77, 18, 4, 0),
(78, 18, 8, 1),
(79, 19, 1, 1),
(80, 20, 1, 1),
(81, 21, 1, 1),
(82, 22, 1, 1),
(83, 23, 1, 1),
(84, 24, 1, 1),
(85, 25, 8, 1),
(86, 26, 8, 1),
(87, 27, 1, 1),
(88, 28, 1, 1),
(89, 29, 1, 1),
(90, 30, 1, 1),
(91, 31, 8, 1);

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

--
-- Volcado de datos para la tabla `canjes`
--

INSERT INTO `canjes` (`id_canje`, `id_suscriptor`, `id_recompensa`, `id_personal`, `puntos_gastados`, `canjeado_en`) VALUES
(1, 8, 1, 1, 1000, '2026-03-28 05:01:27'),
(2, 8, 5, 1, 1000000, '2026-03-28 05:04:35'),
(3, 10, 5, 1, 1000000, '2026-03-28 05:09:42'),
(4, 10, 1, 1, 1000, '2026-03-28 05:09:58'),
(5, 10, 2, 1, 1000000, '2026-03-28 05:10:03'),
(6, 10, 6, 1, 500, '2026-03-28 05:11:37'),
(7, 10, 6, 1, 500, '2026-03-28 05:11:40'),
(8, 10, 6, 1, 500, '2026-03-28 05:11:43'),
(9, 10, 6, 1, 500, '2026-03-28 05:11:46'),
(10, 10, 6, 1, 500, '2026-03-28 05:11:50');

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
(11, 1, 12, 'personal', 'muñaño', 1, '2026-04-02 19:08:20', NULL, NULL, NULL, NULL, 'nadie', 1),
(12, 1, 12, 'personal', 'ñoñoño añoo', 1, '2026-04-02 19:08:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(13, 1, 12, 'personal', 'la hora muñañoo', 1, '2026-04-02 19:08:47', NULL, NULL, NULL, NULL, 'nadie', 1),
(14, 1, 12, 'personal', 'me estoy tocando', 1, '2026-04-04 06:39:58', NULL, NULL, NULL, NULL, 'nadie', 1),
(15, 1, 12, 'suscriptor', 'Namamess', 1, '2026-04-04 07:29:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(16, 1, 12, 'personal', 'prueba', 1, '2026-04-04 07:29:49', NULL, NULL, NULL, NULL, 'nadie', 1),
(17, 1, 12, 'suscriptor', 'Verga', 1, '2026-04-04 07:29:55', NULL, NULL, NULL, NULL, 'nadie', 1),
(18, 1, 12, 'suscriptor', 'Jala', 1, '2026-04-04 07:30:00', NULL, NULL, NULL, NULL, 'nadie', 1),
(19, 1, 12, 'personal', 'nononono', 1, '2026-04-04 07:30:12', NULL, NULL, NULL, NULL, 'nadie', 1),
(20, 1, 12, 'personal', 'te doy pene rico?', 1, '2026-04-04 07:30:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(21, 1, 12, 'suscriptor', 'Si we alv', 1, '2026-04-04 07:30:48', NULL, NULL, NULL, NULL, 'nadie', 1),
(22, 2, 12, 'personal', 'hola', 1, '2026-04-04 07:31:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(23, 2, 12, 'suscriptor', 'Hola joto', 1, '2026-04-04 07:31:38', NULL, NULL, NULL, NULL, 'nadie', 1),
(24, 2, 12, 'personal', 'soy mala persona?', 1, '2026-04-04 07:31:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(25, 2, 12, 'suscriptor', 'Eres gay we?', 1, '2026-04-04 07:31:45', NULL, NULL, NULL, NULL, 'nadie', 1),
(26, 2, 12, 'personal', 'me converti en valeria?', 1, '2026-04-04 07:31:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(27, 2, 12, 'suscriptor', 'Aaaaaaaaa', 1, '2026-04-04 07:31:53', NULL, NULL, NULL, NULL, 'nadie', 1),
(28, 2, 12, 'suscriptor', 'Sabroso?', 1, '2026-04-04 07:31:58', NULL, NULL, NULL, NULL, 'nadie', 1),
(29, 2, 12, 'suscriptor', 'Nowe no digas eso', 1, '2026-04-04 07:33:22', NULL, NULL, NULL, NULL, 'nadie', 1),
(30, 2, 12, 'personal', 'unu', 1, '2026-04-04 07:35:31', NULL, NULL, NULL, NULL, 'nadie', 1),
(31, 2, 12, 'suscriptor', 'Hola marica', 1, '2026-04-04 07:35:54', NULL, NULL, NULL, NULL, 'nadie', 1),
(32, 2, 12, 'suscriptor', 'Como andas we', 1, '2026-04-04 07:35:58', NULL, NULL, NULL, NULL, 'nadie', 1),
(33, 2, 12, 'suscriptor', 'Te gusta la verga?', 1, '2026-04-04 07:36:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(34, 2, 12, 'suscriptor', 'O no we', 1, '2026-04-04 07:36:09', NULL, NULL, NULL, NULL, 'nadie', 1),
(35, 1, 12, 'personal', 'si we wacha', 1, '2026-04-04 07:36:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(36, 1, 12, 'suscriptor', 'No mames we', 1, '2026-04-04 07:36:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(37, 2, 12, 'personal', 'joto', 1, '2026-04-04 07:37:00', NULL, NULL, NULL, NULL, 'nadie', 1),
(38, 1, 12, 'suscriptor', 'Que pedo we', 1, '2026-04-04 07:38:12', NULL, NULL, NULL, NULL, 'nadie', 1),
(39, 1, 12, 'personal', 'nada we', 1, '2026-04-04 07:38:16', NULL, NULL, NULL, NULL, 'nadie', 1),
(40, 1, 12, 'personal', 'por que?', 1, '2026-04-04 07:38:19', NULL, NULL, NULL, NULL, 'nadie', 1),
(41, 1, 12, 'personal', 'no se we', 1, '2026-04-04 07:38:21', NULL, NULL, NULL, NULL, 'nadie', 1),
(42, 1, 12, 'personal', 'vete a la verfa we', 1, '2026-04-04 07:38:24', NULL, NULL, NULL, NULL, 'nadie', 1),
(43, 1, 12, 'suscriptor', 'No we', 1, '2026-04-04 07:38:27', NULL, NULL, NULL, NULL, 'nadie', 1),
(44, 1, 12, 'suscriptor', 'Mame el mosntruo', 1, '2026-04-04 07:38:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(45, 2, 12, 'suscriptor', 'Jotote', 1, '2026-04-04 07:38:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(46, 2, 12, 'suscriptor', 'Te dare sexo we', 1, '2026-04-04 07:38:57', NULL, NULL, NULL, NULL, 'nadie', 1),
(47, 1, 12, 'personal', 'jtooer', 1, '2026-04-04 07:39:06', NULL, NULL, NULL, NULL, 'nadie', 1),
(48, 1, 12, 'personal', 'jotote we', 1, '2026-04-04 07:39:11', NULL, NULL, NULL, NULL, 'nadie', 1),
(49, 1, 12, 'personal', 'we we we we we', 1, '2026-04-04 07:39:15', NULL, NULL, NULL, NULL, 'nadie', 1),
(50, 1, 12, 'suscriptor', 'Namesmasdadsasd', 1, '2026-04-04 07:39:24', NULL, NULL, NULL, NULL, 'nadie', 1),
(51, 1, 12, 'suscriptor', 'Asdasdasdad', 1, '2026-04-04 07:39:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(52, 1, 12, 'suscriptor', 'Asdasd', 1, '2026-04-04 07:39:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(53, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(54, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:30', NULL, NULL, NULL, NULL, 'nadie', 1),
(55, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:30', NULL, NULL, NULL, NULL, 'nadie', 1),
(56, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:32', NULL, NULL, NULL, NULL, 'nadie', 1),
(57, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(58, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(59, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:34', NULL, NULL, NULL, NULL, 'nadie', 1),
(60, 1, 12, 'suscriptor', 'Asda', 1, '2026-04-04 07:39:34', NULL, NULL, NULL, NULL, 'nadie', 1),
(61, 1, 12, 'suscriptor', 'Sd', 1, '2026-04-04 07:39:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(62, 1, 12, 'suscriptor', 'Asda', 1, '2026-04-04 07:39:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(63, 1, 12, 'suscriptor', 'Sd', 1, '2026-04-04 07:39:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(64, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:38', NULL, NULL, NULL, NULL, 'nadie', 1),
(65, 1, 12, 'suscriptor', 'Asdasdaas', 1, '2026-04-04 07:39:40', NULL, NULL, NULL, NULL, 'nadie', 1),
(66, 1, 12, 'suscriptor', 'Das', 1, '2026-04-04 07:39:40', NULL, NULL, NULL, NULL, 'nadie', 1),
(67, 1, 12, 'suscriptor', 'Das', 1, '2026-04-04 07:39:41', NULL, NULL, NULL, NULL, 'nadie', 1),
(68, 1, 12, 'suscriptor', 'Da', 1, '2026-04-04 07:39:41', NULL, NULL, NULL, NULL, 'nadie', 1),
(69, 1, 12, 'suscriptor', 'Sda', 1, '2026-04-04 07:39:41', NULL, NULL, NULL, NULL, 'nadie', 1),
(70, 1, 12, 'suscriptor', 'Sdas', 1, '2026-04-04 07:39:42', NULL, NULL, NULL, NULL, 'nadie', 1),
(71, 1, 12, 'suscriptor', 'Da', 1, '2026-04-04 07:39:43', NULL, NULL, NULL, NULL, 'nadie', 1),
(72, 1, 12, 'suscriptor', 'Sd', 1, '2026-04-04 07:39:43', NULL, NULL, NULL, NULL, 'nadie', 1),
(73, 1, 12, 'suscriptor', 'Asda', 1, '2026-04-04 07:39:43', NULL, NULL, NULL, NULL, 'nadie', 1),
(74, 1, 12, 'suscriptor', 'Sda', 1, '2026-04-04 07:39:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(75, 1, 12, 'suscriptor', 'Sda', 1, '2026-04-04 07:39:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(76, 1, 12, 'suscriptor', 'Sda', 1, '2026-04-04 07:39:45', NULL, NULL, NULL, NULL, 'nadie', 1),
(77, 1, 12, 'suscriptor', 'Sda', 1, '2026-04-04 07:39:46', NULL, NULL, NULL, NULL, 'nadie', 1),
(78, 1, 12, 'suscriptor', 'Sdasda', 1, '2026-04-04 07:39:46', NULL, NULL, NULL, NULL, 'nadie', 1),
(79, 1, 12, 'suscriptor', 'Sd', 1, '2026-04-04 07:39:46', NULL, NULL, NULL, NULL, 'nadie', 1),
(80, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:47', NULL, NULL, NULL, NULL, 'nadie', 1),
(81, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:47', NULL, NULL, NULL, NULL, 'nadie', 1),
(82, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:48', NULL, NULL, NULL, NULL, 'nadie', 1),
(83, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:48', NULL, NULL, NULL, NULL, 'nadie', 1),
(84, 1, 12, 'suscriptor', 'Asd', 1, '2026-04-04 07:39:49', NULL, NULL, NULL, NULL, 'nadie', 1),
(85, 1, 12, 'suscriptor', 'Asda', 1, '2026-04-04 07:39:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(86, 1, 12, 'suscriptor', 'Sd', 1, '2026-04-04 07:39:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(87, 1, 12, 'personal', 'que verga queries cabroon', 1, '2026-04-04 07:39:59', NULL, NULL, NULL, NULL, 'nadie', 1),
(88, 1, 12, 'personal', 'a al vergaaa', 1, '2026-04-04 07:40:02', NULL, NULL, NULL, NULL, 'nadie', 1),
(89, 1, 12, 'personal', 'chingatumadre alvvv', 1, '2026-04-04 07:40:06', NULL, NULL, NULL, NULL, 'nadie', 1),
(90, 1, 12, 'personal', 'puto joto de cagadaaa', 1, '2026-04-04 07:40:10', NULL, NULL, NULL, NULL, 'nadie', 1),
(91, 1, 12, 'personal', 'vete a la mierdaaaa', 1, '2026-04-04 07:40:14', NULL, NULL, NULL, NULL, 'nadie', 1),
(92, 1, 12, 'personal', 'AÑAAAA', 1, '2026-04-04 07:40:16', NULL, NULL, NULL, NULL, 'nadie', 1),
(93, 1, 12, 'personal', 'ÑOOÑOOÑOO MUÑAÑOO ÑAAAÑOÑOAÑOÑAOAÑAAA', 1, '2026-04-04 07:40:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(94, 1, 12, 'personal', 'BIOBIBOIBOIBI', 1, '2026-04-04 07:40:31', NULL, NULL, NULL, NULL, 'nadie', 1),
(95, 2, 12, 'personal', 'te doy pene?', 1, '2026-04-04 07:40:31', NULL, NULL, NULL, NULL, 'nadie', 1),
(96, 1, 12, 'personal', 'BOBUBOUBUOB', 1, '2026-04-04 07:40:32', NULL, NULL, NULL, NULL, 'nadie', 1),
(97, 1, 12, 'personal', 'BUBUOBUBOUBOU', 1, '2026-04-04 07:40:34', NULL, NULL, NULL, NULL, 'nadie', 1),
(98, 1, 12, 'personal', 'UBUOB', 1, '2026-04-04 07:40:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(99, 2, 12, 'suscriptor', 'SI WE', 1, '2026-04-04 07:40:42', NULL, NULL, NULL, NULL, 'nadie', 1),
(100, 2, 12, 'suscriptor', 'RICO RICOOO', 1, '2026-04-04 07:40:47', NULL, NULL, NULL, NULL, 'nadie', 1),
(101, 1, 12, 'personal', 'e we', 1, '2026-04-04 07:41:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(102, 1, 12, 'personal', 'a cabron', 1, '2026-04-04 07:41:45', NULL, NULL, NULL, NULL, 'nadie', 1),
(103, 1, 12, 'personal', 'que edp', 1, '2026-04-04 07:42:01', NULL, NULL, NULL, NULL, 'nadie', 1),
(104, 1, 12, 'personal', 'a la verga', 1, '2026-04-04 07:42:11', NULL, NULL, NULL, NULL, 'nadie', 1),
(105, 1, 12, 'suscriptor', 'E we', 1, '2026-04-04 07:49:08', NULL, NULL, NULL, NULL, 'nadie', 1),
(106, 1, 12, 'personal', 'e we', 1, '2026-04-04 07:49:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(107, 1, 12, 'suscriptor', 'Que paso we', 1, '2026-04-04 07:49:38', NULL, NULL, NULL, NULL, 'nadie', 1),
(108, 1, 12, 'personal', 'no se we', 1, '2026-04-04 07:49:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(109, 1, 12, 'suscriptor', 'Nada we?', 1, '2026-04-04 07:49:52', NULL, NULL, NULL, NULL, 'nadie', 1),
(110, 1, 12, 'personal', 'segurp we?', 1, '2026-04-04 07:50:17', NULL, NULL, NULL, NULL, 'nadie', 1),
(111, 1, 12, 'suscriptor', 'Si we', 1, '2026-04-04 07:50:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(112, 1, 12, 'suscriptor', 'Gg', 1, '2026-04-04 07:50:31', NULL, NULL, NULL, NULL, 'nadie', 1),
(113, 2, 12, 'personal', 'hola pitudo', 1, '2026-04-04 07:51:23', NULL, NULL, NULL, NULL, 'nadie', 1),
(114, 2, 12, 'suscriptor', 'Putote', 1, '2026-04-04 07:51:24', NULL, NULL, NULL, NULL, 'nadie', 1),
(115, 2, 12, 'suscriptor', 'Si ves esto?', 1, '2026-04-04 07:51:27', NULL, NULL, NULL, NULL, 'nadie', 1),
(116, 2, 12, 'suscriptor', 'no mames', 1, '2026-04-04 07:51:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(117, 2, 12, 'personal', 'hola joto', 1, '2026-04-06 04:36:53', NULL, NULL, NULL, NULL, 'nadie', 1),
(118, 8, 12, 'personal', 'hola', 1, '2026-04-07 02:59:21', NULL, NULL, NULL, NULL, 'nadie', 1),
(119, 1, 4, 'personal', 'mariaca gay sabrose', 0, '2026-04-07 05:27:57', NULL, NULL, NULL, NULL, 'nadie', 0),
(120, 1, 12, 'personal', 'bnnnoionio\noninioino', 1, '2026-04-07 06:27:55', NULL, NULL, NULL, NULL, 'nadie', 1),
(121, 1, 12, 'suscriptor', 'Marica\nDe cagada', 1, '2026-04-07 06:42:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(122, 1, 12, 'personal', 'que show mendigo joto', 1, '2026-04-07 06:42:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(123, 1, 12, 'suscriptor', 'Nada we todo chill la neta', 1, '2026-04-07 06:42:45', NULL, NULL, NULL, NULL, 'nadie', 1),
(124, 1, 12, 'personal', 'me da gusto we', 1, '2026-04-07 06:42:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(125, 1, 12, 'personal', 'amo a Vanne alv', 1, '2026-04-07 06:42:56', NULL, NULL, NULL, NULL, 'nadie', 1),
(126, 1, 12, 'suscriptor', 'Ni se nota hijo de perra', 1, '2026-04-07 06:43:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(127, 1, 12, 'suscriptor', 'No?', 1, '2026-04-07 07:06:00', NULL, NULL, NULL, NULL, 'nadie', 1),
(128, 1, 12, 'personal', 'no puto animal', 1, '2026-04-07 07:06:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(129, 1, 12, 'personal', 'AÑAAA', 1, '2026-04-07 07:06:09', NULL, NULL, NULL, NULL, 'nadie', 1),
(130, 1, 12, 'suscriptor', 'Arre jotote', 1, '2026-04-07 07:06:13', NULL, NULL, NULL, NULL, 'nadie', 1),
(131, 1, 12, 'suscriptor', 'We', 1, '2026-04-07 07:06:19', NULL, NULL, NULL, NULL, 'nadie', 1),
(132, 1, 12, 'suscriptor', 'Jotoputo', 1, '2026-04-07 07:06:27', NULL, NULL, NULL, NULL, 'nadie', 1),
(133, 8, 12, 'personal', 'hola', 1, '2026-04-07 07:23:16', NULL, NULL, NULL, NULL, 'nadie', 1),
(134, 8, 12, 'personal', 'jotote', 1, '2026-04-07 07:32:25', NULL, NULL, NULL, NULL, 'nadie', 1),
(135, 8, 12, 'suscriptor', 'Hola mendigo marica jotote', 1, '2026-04-07 07:32:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(136, 8, 12, 'personal', 'puto', 1, '2026-04-07 07:34:09', 135, 'Hola mendigo marica jotote', 'suscriptor', NULL, 'nadie', 1),
(137, 8, 12, 'personal', 'xzcXZ', 1, '2026-04-07 07:34:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(138, 1, 12, 'personal', 'we', 1, '2026-04-07 08:06:07', NULL, NULL, NULL, NULL, 'nadie', 1),
(139, 1, 12, 'personal', 'chachooo}', 1, '2026-04-07 08:13:14', NULL, NULL, NULL, NULL, 'nadie', 1),
(140, 1, 12, 'personal', 'ño muñañooo', 1, '2026-04-07 08:13:22', NULL, NULL, NULL, NULL, 'nadie', 1),
(141, 1, 4, 'personal', 'añaa', 0, '2026-04-07 08:13:33', NULL, NULL, NULL, NULL, 'nadie', 0),
(142, 1, 4, 'personal', 'faaaah', 0, '2026-04-07 08:21:31', NULL, NULL, NULL, NULL, 'nadie', 0),
(143, 8, 12, 'personal', 'hola joto', 1, '2026-04-08 05:38:57', NULL, NULL, NULL, NULL, 'nadie', 1),
(144, 8, 12, 'personal', 'que modificaciones hiciste?', 1, '2026-04-08 05:39:07', NULL, NULL, NULL, NULL, 'nadie', 1),
(145, 8, 12, 'suscriptor', 'No se', 1, '2026-04-14 02:11:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(146, 8, 12, 'suscriptor', 'Suck dick', 1, '2026-04-14 02:11:43', NULL, NULL, NULL, NULL, 'nadie', 1),
(147, 1, 12, 'personal', 'ewe joto', 1, '2026-04-14 02:19:42', NULL, NULL, NULL, NULL, 'nadie', 1),
(148, 1, 12, 'personal', 'vete a laverga we', 1, '2026-04-14 02:20:05', NULL, NULL, NULL, NULL, 'nadie', 1),
(149, 1, 12, 'suscriptor', 'Por que we', 1, '2026-04-14 02:20:10', NULL, NULL, NULL, NULL, 'nadie', 1),
(150, 1, 12, 'suscriptor', 'Nomad we', 1, '2026-04-14 02:20:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(151, 1, 12, 'personal', 'arre joto', 1, '2026-04-14 02:20:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(152, 8, 12, 'personal', 'suck my dick', 1, '2026-04-14 04:55:42', NULL, NULL, NULL, NULL, 'nadie', 1),
(153, 8, 12, 'suscriptor', 'Chachoo', 1, '2026-04-14 05:31:22', NULL, NULL, NULL, NULL, 'nadie', 1),
(154, 8, 12, 'personal', 'aniooo', 1, '2026-04-14 06:06:17', NULL, NULL, NULL, NULL, 'nadie', 1),
(155, 8, 12, 'personal', 'hola ugu', 1, '2026-04-14 06:06:25', NULL, NULL, NULL, NULL, 'nadie', 1),
(156, 1, 12, 'personal', 'mendigo marinconsote', 1, '2026-04-17 02:10:59', NULL, NULL, NULL, NULL, 'nadie', 1),
(157, 1, 12, 'personal', 'a la verga muñeño', 1, '2026-04-17 02:11:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(159, 1, 12, 'personal', 'te crees bien aña???', 1, '2026-04-17 02:12:23', NULL, NULL, NULL, NULL, 'nadie', 1),
(160, 1, 12, 'personal', 'asd', 1, '2026-04-17 02:12:32', NULL, NULL, NULL, NULL, 'nadie', 1),
(161, 1, 12, 'personal', 'asdasdasd', 1, '2026-04-17 02:12:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(162, 1, 12, 'personal', 'asasdasd', 1, '2026-04-17 02:12:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(163, 1, 12, 'personal', 'asdasdasd', 1, '2026-04-17 02:12:59', NULL, NULL, NULL, NULL, 'nadie', 1),
(164, 1, 12, 'personal', 'sdasd', 1, '2026-04-17 02:14:43', NULL, NULL, NULL, NULL, 'nadie', 1),
(165, 1, 12, 'personal', 'joto', 1, '2026-04-17 02:41:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(166, 1, 12, 'personal', 'marica', 1, '2026-04-17 02:41:32', NULL, NULL, NULL, NULL, 'nadie', 1),
(167, 1, 12, 'personal', 'vete a la verga', 1, '2026-04-17 02:41:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(168, 1, 12, 'personal', 'no we', 1, '2026-04-17 02:41:45', NULL, NULL, NULL, NULL, 'nadie', 1),
(169, 1, 12, 'personal', 'chinga a tu madre', 1, '2026-04-17 02:41:49', NULL, NULL, NULL, NULL, 'nadie', 1),
(170, 1, 12, 'personal', 'vete al skibidiii toileeettt', 1, '2026-04-17 02:42:54', NULL, NULL, NULL, NULL, 'nadie', 1),
(172, 1, 12, 'personal', 'joto', 1, '2026-04-17 02:48:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(173, 1, 12, 'personal', 'aña', 1, '2026-04-17 02:49:06', NULL, NULL, NULL, NULL, 'nadie', 1),
(174, 1, 12, 'personal', 'muña?', 1, '2026-04-17 03:35:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(175, 1, 12, 'personal', 'chachooo', 1, '2026-04-17 03:35:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(176, 1, 12, 'personal', 'skibididooop yes yesss', 1, '2026-04-17 03:36:08', NULL, NULL, NULL, NULL, 'nadie', 1),
(177, 1, 12, 'personal', 'guasaaaa', 1, '2026-04-17 03:36:12', NULL, NULL, NULL, NULL, 'nadie', 1),
(178, 1, 12, 'personal', 'jotoo', 1, '2026-04-17 03:39:03', NULL, NULL, NULL, NULL, 'nadie', 1),
(179, 1, 12, 'personal', 'maricon de cagadaaaa', 1, '2026-04-17 03:39:07', NULL, NULL, NULL, NULL, 'nadie', 1),
(180, 1, 12, 'personal', 'ÑIAAAAAA', 1, '2026-04-17 03:39:10', NULL, NULL, NULL, NULL, 'nadie', 1),
(181, 1, 12, 'suscriptor', 'Vete a la verga', 1, '2026-04-17 03:40:19', 179, 'maricon de cagadaaaa', 'personal', NULL, 'nadie', 1),
(182, 1, 12, 'personal', 'jototeeee', 1, '2026-04-17 03:40:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(183, 1, 12, 'personal', 'ño', 1, '2026-04-17 03:48:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(184, 1, 12, 'suscriptor', 'We', 1, '2026-04-17 04:07:02', NULL, NULL, NULL, NULL, 'nadie', 1),
(185, 1, 12, 'personal', 'we', 1, '2026-04-17 04:07:55', NULL, NULL, NULL, NULL, 'nadie', 1),
(186, 1, 12, 'personal', 'we', 1, '2026-04-17 04:07:57', NULL, NULL, NULL, NULL, 'nadie', 1),
(187, 1, 12, 'suscriptor', 'Qw', 1, '2026-04-17 04:08:06', NULL, NULL, NULL, NULL, 'nadie', 1),
(188, 1, 12, 'suscriptor', 'Que we', 1, '2026-04-17 04:08:14', NULL, NULL, NULL, NULL, 'nadie', 1),
(189, 1, 12, 'suscriptor', 'Ww', 1, '2026-04-17 04:08:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(190, 1, 12, 'suscriptor', 'E', 1, '2026-04-17 04:08:52', NULL, NULL, NULL, NULL, 'nadie', 1),
(191, 1, 12, 'personal', 'we', 1, '2026-04-17 04:16:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(192, 1, 12, 'suscriptor', 'W', 1, '2026-04-17 04:16:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(193, 1, 12, 'suscriptor', 'Yyyy', 1, '2026-04-17 04:16:46', NULL, NULL, NULL, NULL, 'nadie', 1),
(194, 1, 12, 'suscriptor', 'Yu', 1, '2026-04-17 04:24:14', NULL, NULL, NULL, NULL, 'nadie', 1),
(195, 1, 12, 'suscriptor', 'I', 1, '2026-04-17 04:26:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(196, 1, 12, 'suscriptor', 'I', 1, '2026-04-17 04:26:51', NULL, NULL, NULL, NULL, 'nadie', 1),
(197, 1, 12, 'suscriptor', 'J', 1, '2026-04-17 04:27:16', NULL, NULL, NULL, NULL, 'nadie', 1),
(198, 1, 12, 'suscriptor', 'I', 1, '2026-04-17 04:28:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(199, 1, 12, 'suscriptor', 'ddd', 1, '2026-04-17 04:28:40', NULL, NULL, NULL, NULL, 'nadie', 1),
(200, 1, 12, 'suscriptor', 'Uu', 1, '2026-04-17 04:28:55', NULL, NULL, NULL, NULL, 'nadie', 1),
(201, 1, 12, 'personal', 'as', 1, '2026-04-17 04:29:16', NULL, NULL, NULL, NULL, 'nadie', 1),
(202, 1, 12, 'suscriptor', 'Oo', 1, '2026-04-17 04:29:24', NULL, NULL, NULL, NULL, 'nadie', 1),
(203, 1, 12, 'suscriptor', 'H', 1, '2026-04-17 04:35:08', NULL, NULL, NULL, NULL, 'nadie', 1),
(204, 1, 12, 'suscriptor', 'K', 1, '2026-04-17 04:37:22', NULL, NULL, NULL, NULL, 'nadie', 1),
(205, 1, 12, 'personal', 'qp', 1, '2026-04-17 04:37:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(206, 1, 12, 'personal', 'deja de jalarte la verga we', 1, '2026-04-17 04:38:47', NULL, NULL, NULL, '2026-04-17 04:39:00', 'nadie', 1),
(207, 1, 12, 'suscriptor', 'Oki', 1, '2026-04-17 04:39:20', NULL, NULL, NULL, NULL, 'nadie', 1),
(208, 1, 12, 'personal', 'deja de ver pornito', 1, '2026-04-17 04:40:26', NULL, NULL, NULL, NULL, 'nadie', 1),
(209, 1, 12, 'suscriptor', 'Tu tampoco te la jales con mis fotos we', 1, '2026-04-17 04:40:46', NULL, NULL, NULL, NULL, 'nadie', 1),
(210, 1, 12, 'personal', 'vete a la verga', 1, '2026-04-17 04:40:57', NULL, NULL, NULL, NULL, 'nadie', 1),
(211, 1, 12, 'personal', '.', 1, '2026-04-17 14:27:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(212, 1, 12, 'personal', '.', 1, '2026-04-17 14:27:35', NULL, NULL, NULL, NULL, 'nadie', 1),
(213, 1, 12, 'personal', '..', 1, '2026-04-17 14:27:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(214, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(215, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(216, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:37', NULL, NULL, NULL, NULL, 'nadie', 1),
(217, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:38', NULL, NULL, NULL, NULL, 'nadie', 1),
(218, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(219, 1, 12, 'personal', '....', 1, '2026-04-17 14:27:39', NULL, NULL, NULL, NULL, 'nadie', 1),
(220, 1, 12, 'personal', '...', 1, '2026-04-17 14:27:40', NULL, NULL, NULL, NULL, 'nadie', 1),
(221, 1, 12, 'personal', '.', 1, '2026-04-17 14:28:50', NULL, NULL, NULL, NULL, 'nadie', 1),
(222, 1, 12, 'personal', 'hola', 1, '2026-04-17 14:33:56', NULL, NULL, NULL, NULL, 'nadie', 1),
(223, 1, 12, 'suscriptor', 'Hola tilingolilingo', 1, '2026-04-17 14:34:07', NULL, NULL, NULL, NULL, 'nadie', 1),
(224, 1, 12, 'suscriptor', 'Hh', 1, '2026-04-17 14:34:33', NULL, NULL, NULL, NULL, 'nadie', 1),
(225, 8, 12, 'personal', 'hola', 1, '2026-04-24 04:19:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(226, 8, 12, 'suscriptor', 'Marica de cagafa\nMarica', 1, '2026-04-24 04:20:28', NULL, NULL, NULL, NULL, 'nadie', 1),
(227, 8, 12, 'personal', 'munano', 1, '2026-04-24 04:20:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(228, 8, 12, 'personal', 'munano', 1, '2026-04-24 04:20:44', NULL, NULL, NULL, NULL, 'nadie', 1),
(229, 8, 12, 'suscriptor', 'Asdaasdasd', 1, '2026-04-24 04:21:06', NULL, NULL, NULL, NULL, 'nadie', 1),
(230, 1, 12, 'personal', 'asdadasdasdasdasdasdasdasd', 1, '2026-04-24 04:21:13', NULL, NULL, NULL, NULL, 'nadie', 1),
(231, 1, 12, 'personal', 'asdasdasdasdasd', 1, '2026-04-24 04:21:22', NULL, NULL, NULL, NULL, 'nadie', 1),
(232, 1, 12, 'suscriptor', 'Joto de cagadaaaa', 1, '2026-04-24 04:21:31', NULL, NULL, NULL, NULL, 'nadie', 1),
(233, 1, 12, 'personal', 'unu', 1, '2026-04-24 04:21:40', NULL, NULL, NULL, NULL, 'nadie', 1),
(234, 8, 12, 'personal', 'hola', 1, '2026-04-24 04:42:10', NULL, NULL, NULL, NULL, 'nadie', 1),
(235, 8, 12, 'suscriptor', 'hola\ninsnao\nchupame else pene', 1, '2026-04-24 04:42:25', NULL, NULL, NULL, NULL, 'nadie', 1),
(236, 8, 12, 'personal', 'cortate las bolas', 1, '2026-04-24 04:42:34', NULL, NULL, NULL, NULL, 'nadie', 1),
(237, 8, 12, 'suscriptor', 'Exitante', 1, '2026-04-24 04:43:04', NULL, NULL, NULL, NULL, 'nadie', 1),
(238, 8, 12, 'personal', 'bastardo', 1, '2026-04-24 04:43:09', NULL, NULL, NULL, NULL, 'nadie', 1),
(239, 1, 12, 'personal', 'chacho', 1, '2026-04-28 04:53:03', NULL, NULL, NULL, NULL, 'nadie', 1),
(240, 1, 12, 'suscriptor', 'mueo', 1, '2026-04-28 04:53:18', NULL, NULL, NULL, NULL, 'nadie', 1),
(241, 1, 12, 'suscriptor', 'Joto', 1, '2026-04-28 04:53:30', NULL, NULL, NULL, NULL, 'nadie', 1),
(242, 1, 12, 'personal', 'h', 1, '2026-04-28 05:45:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(243, 1, 12, 'suscriptor', 'joot', 1, '2026-04-28 05:45:36', NULL, NULL, NULL, NULL, 'nadie', 1),
(244, 8, 12, 'suscriptor', 'the amount', 1, '2026-05-02 05:47:29', NULL, NULL, NULL, NULL, 'nadie', 1),
(245, 8, 12, 'personal', 'te amo desde el primer momento en que te vi', 1, '2026-05-02 05:47:43', NULL, NULL, NULL, NULL, 'nadie', 1);

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
(1, 1, 4, 'dias', 4, 24, 24, 24, '2026-05-06 13:36:00', '2026-05-10 13:36:00');

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
(9, 12, 1, 0, '2026-04-24 14:28:53'),
(10, 12, 1, 0, '2026-04-24 14:29:25'),
(11, 12, 1, 0, '2026-04-28 06:02:54'),
(12, 12, 8, 0, '2026-05-02 05:26:52'),
(13, 12, 8, 0, '2026-05-02 05:27:02'),
(14, 12, 1, 0, '2026-05-06 23:43:14'),
(15, 12, 1, 0, '2026-05-08 14:32:30');

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
(43, 9, 1, 1, 'Desayuno', NULL, NULL, NULL),
(44, 9, 1, 2, 'Comida', NULL, NULL, NULL),
(45, 9, 1, 3, 'Cena', NULL, NULL, NULL),
(46, 10, 1, 1, 'Desayuno', NULL, NULL, NULL),
(47, 10, 1, 2, 'Comida', NULL, NULL, NULL),
(48, 10, 1, 3, 'Cena', NULL, NULL, NULL),
(49, 11, 1, 1, '📋 FAKE LOVE (0 Kcal | 0g prot)\n• JI MIN: 100.00 pz', NULL, NULL, NULL),
(50, 11, 2, 1, '📋 BTS (1222.00 Kcal | 1222.00g prot)\n• JI MIN: 100.00 pz\n• JUNGKOK: 100.00 pz\n• SUGA: 100.00 g', NULL, 1222.00, NULL),
(51, 11, 2, 2, '📋 FAKE LOVE (0 Kcal | 0g prot)\n• JI MIN: 100.00 pz', NULL, NULL, NULL),
(52, 11, 2, 3, '📋 FAKE LOVE (0 Kcal | 0g prot)\n• JI MIN: 100.00 pz', NULL, NULL, NULL),
(53, 12, 1, 1, '📋 BTS (1222.00 Kcal | 1222.00g prot)\n• JI MIN: 100.00 pz\n• JUNGKOK: 100.00 pz\n• SUGA: 100.00 g\n\n📋 FAKE LOVE (0 Kcal | 0g prot)\n• JI MIN: 100.00 pz', NULL, NULL, NULL),
(54, 12, 1, 2, 'Comida', NULL, NULL, NULL),
(55, 12, 1, 3, 'Cena', NULL, NULL, NULL),
(56, 13, 1, 1, '📋 BTS (1222.00 Kcal | 1222.00g prot)\n• JI MIN: 100.00 pz\n• JUNGKOK: 100.00 pz\n• SUGA: 100.00 g\n\n📋 FAKE LOVE (0 Kcal | 0g prot)\n• JI MIN: 100.00 pz', NULL, NULL, NULL),
(57, 13, 1, 2, 'Comida', NULL, NULL, NULL),
(58, 13, 1, 3, 'Cena', NULL, NULL, NULL),
(59, 14, 1, 1, 'Desayuno', NULL, NULL, NULL),
(60, 14, 1, 2, 'Comida', NULL, NULL, NULL),
(61, 14, 1, 3, 'Cena', NULL, NULL, NULL),
(62, 15, 1, 1, '📋 Ensalada (415.00 Kcal | 30.00g prot)\n• JI MIN: 1.00 pz\n• huevo: 5.00 g\n• JUNGKOK: 1.00 pz\n• Jitomate: 100.00 g\n• Verdolaga: 20.00 g\n• Aceite de olivo: 1.00 cdita', 6, 415.00, NULL),
(63, 15, 1, 2, '📋 Ensalada (415.00 Kcal | 30.00g prot)\n• JI MIN: 1.00 pz\n• huevo: 5.00 g\n• JUNGKOK: 1.00 pz\n• Jitomate: 100.00 g\n• Verdolaga: 20.00 g\n• Aceite de olivo: 1.00 cdita', 6, 415.00, NULL),
(64, 15, 1, 3, 'yogurt', NULL, NULL, NULL),
(65, 15, 1, 4, '📋 Sandwich (123.00 Kcal | 12.00g prot)\n• Pan de caja: 100.00 g\n• Jamon: 100.00 g\n• Jitomate: 10220.00 g', 5, 123.00, NULL);

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

--
-- Volcado de datos para la tabla `ejercicios`
--

INSERT INTO `ejercicios` (`id_ejercicio`, `nombre`, `imagen_url`, `creado_por`, `creado_en`) VALUES
(16, 'Press plano', '/uploads/personal/ejercicio_1778249742181.ico', 1, '2026-05-08 14:15:42'),
(17, 'Press inclinado', '/uploads/personal/ejercicio_1778249754326.ico', 1, '2026-05-08 14:15:54'),
(18, 'Jalon al pecho', '/uploads/personal/ejercicio_1778249803653.jpg', 1, '2026-05-08 14:16:29'),
(19, 'Remo gironda', '/uploads/personal/ejercicio_1778249818432.jpg', 1, '2026-05-08 14:16:58'),
(20, 'Sentadilla libre', '/uploads/personal/ejercicio_1778249831876.jpeg', 1, '2026-05-08 14:17:11'),
(21, 'Press Pucio', '/uploads/personal/ejercicio_1778249846671.jpg', 1, '2026-05-08 14:17:26'),
(22, 'Curl predicador', '/uploads/personal/ejercicio_1778249886814.jpg', 1, '2026-05-08 14:18:06'),
(23, 'Peso vivo', '/uploads/personal/ejercicio_1778249903379.jpg', 1, '2026-05-08 14:18:23'),
(24, 'Introducciones pelvicas', '/uploads/personal/ejercicio_1778250010324.jpg', 1, '2026-05-08 14:19:03');

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
(164, '6F47323D', 'nfc', '04:25:1A:1A:49:44:80', 1, 'done', 'completado', '2026-05-08 14:05:49', NULL, NULL),
(165, '1A9D2BF2', 'nfc', '23:ED:42:FA', 1, 'done', 'completado', '2026-05-08 14:06:33', NULL, NULL);

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
(1, 1, 'Axel Adrian', 'Aguirre', 'Casas', 19, 'M', 'entrenador_nutriologo', 'axl_agr', '$2b$10$WhcqLwR5ebynxc0yRT/jxu9W/D8.NOO04UDXohA2EauSZZMX8dAfy', '/uploads/personal/personal_1773153421356.png', 1, '2026-03-10 14:37:01', 'fr_ChE0yxTVLvPb1vwV1KB:APA91bGfROIDa7UasAihq2Sa3GmZI_fF3VwHsf0D9bGnLplKnfrtTncJc9IXUONcSwibiOVA69-66zJbp5p4AJWzpMsPZhLKLW5JybzfVMKWsej1X-jQF-4'),
(2, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', 21, 'M', 'entrenador_nutriologo', 'Alfonso', '$2b$10$zByn7qzqRfhV62VNvD3NcuzqVg.mIf0zaSRRklAqzpbxuk9vKlfzO', '/uploads/personal/personal_1773164503664.png', 1, '2026-03-10 15:37:25', NULL),
(3, 1, 'Alejandro', 'perez', 'diez', 32, 'F', 'entrenador', 'entrenador_1', '$2b$10$2t561C3MT2/kT2R.UMAFUOrJxhz5TZ5F6xqx7xSUuPcBGZk3fPUdK', '/uploads/personal/personal_1773157098506.png', 1, '2026-03-10 15:38:18', NULL),
(4, 1, 'vanne', 'cortez', 'perez', 23, 'F', 'nutriologo', 'nutriologo_1', '$2b$10$uqwGzQceFsvPvWFPc/3JiOXTYtYtDyxnuGR/4VaEzJXaIj029s8J2', '/uploads/personal/personal_1773157150046.png', 1, '2026-03-10 15:39:10', NULL),
(5, 4, 'Carlos', 'Perez', 'Sanchez', 34, 'M', 'entrenador_nutriologo', 'Carlos Avila', '$2b$10$jA0mA/m6zVZ2AlKnXJtg0OxJU4CXtImwxZ7CfovqeYglLblIDT3PO', '/uploads/personal/personal_1773158072676.jpeg', 1, '2026-03-10 15:54:32', NULL),
(6, 4, 'Cristian Alfonso', 'Amezcua ', 'Trejo', 21, 'M', 'entrenador', 'Poncho', '$2b$10$nkchYQiTJCrEVmeweFJXO.uSx6hzK7Owl6wX37xKSePXHjsAIK7DO', '/uploads/personal/personal_1773163617977.png', 1, '2026-03-10 17:26:57', NULL),
(7, 6, 'Alfonso', 'Amezcua', 'Trejo', 19, 'M', 'nutriologo', 'alfonso@gmail.com', '$2b$10$9oaimbYKB9mMGM/g.tg9euUi8s2d9AYyLPABB5wMNB.0mYMCr5XSK', '/uploads/personal/personal_1773410570305.jpeg', 1, '2026-03-13 14:02:50', NULL),
(8, 1, 'cristian alfonso ', 'amezcua ', 'trejo', 19, 'M', 'entrenador_nutriologo', 'Cristian', '$2b$10$y4UNqCNBZqsjlcuXpWXV3OTW08cFPscR58LXdJPAkPbTEH9y03VlK', '/uploads/personal/personal_1775627592903.png', 1, '2026-03-13 14:04:56', NULL);

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
(3, 1, 'Sesiones promo', 'sesiones de nutriologo y entrenador', 0, 300.00, 10, 10, 1),
(6, 1, 'prueba2', 'hola', 1, 2.00, 1, 1, 1);

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
(5, 'Sandwich', NULL, 12.00, 123.00, 122.00, NULL, 1, '2026-05-07 02:19:25'),
(6, 'Ensalada', NULL, 30.00, 415.00, 15.00, NULL, 1, '2026-05-08 14:31:35');

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
(2, 1, 'Pree de boca a boca por axel', 1000000, 0),
(3, 1, '2 dias gym', 900, 0),
(4, 1, 'pene a boca', 67, 0),
(5, 1, 'metida de pene a la culona', 1000000, 0),
(6, 1, 'transgenero pitudo', 500, 0);

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

--
-- Volcado de datos para la tabla `registros_fisicos`
--

INSERT INTO `registros_fisicos` (`id_registro`, `id_suscriptor`, `id_nutriologo`, `peso_kg`, `altura_cm`, `edad`, `pct_grasa`, `pct_musculo`, `actividad`, `objetivo`, `notas`, `tmb`, `tdee`, `proteinas_min`, `proteinas_max`, `grasas_min`, `grasas_max`, `carbs_min`, `carbs_max`, `creado_en`) VALUES
(3, 10, 8, 70.00, 179.00, 19, 50.00, 20.00, 'Muy_Activo', 'Pérdida de Grasa (-15%)', 'muy potaxio', 1729.00, 2535.00, 105.00, 140.00, 56.00, 84.00, 253.00, 317.00, '2026-04-02 06:25:46'),
(4, 10, 1, 70.00, 179.00, 19, 50.00, 20.00, 'Moderadamente_Activo', 'Mantenimiento', NULL, 1729.00, 2680.00, 84.00, 105.00, 60.00, 89.00, 268.00, 335.00, '2026-04-02 06:26:59'),
(5, 10, 1, 70.00, 179.00, 19, 50.00, 20.00, 'Moderadamente_Activo', 'Mantenimiento', NULL, 1729.00, 2680.00, 84.00, 105.00, 60.00, 89.00, 268.00, 335.00, '2026-04-02 06:27:06'),
(7, 12, 1, 80.00, 179.00, 19, 15.00, 30.00, 'Moderadamente_Activo', 'Ganancia Muscular (+10%)', 'FLACOTE', 1829.00, 3118.00, 96.00, 120.00, 69.00, 104.00, 312.00, 390.00, '2026-04-24 13:41:23'),
(9, 12, 1, 80.00, 179.00, 19, 15.00, 30.00, 'Moderadamente_Activo', 'Mantenimiento', NULL, 1829.00, 2835.00, 96.00, 120.00, 63.00, 94.00, 283.00, 354.00, '2026-05-06 20:57:24'),
(10, 12, 1, 80.00, 179.00, 19, 15.00, 30.00, 'Moderadamente_Activo', 'Mantenimiento', NULL, 1829.00, 2835.00, 96.00, 120.00, 63.00, 94.00, 283.00, 354.00, '2026-05-06 20:57:25');

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

--
-- Volcado de datos para la tabla `registro_entrenamiento`
--

INSERT INTO `registro_entrenamiento` (`id`, `id_rutina_ejercicio`, `id_suscriptor`, `num_serie`, `peso_levantado`, `reps_realizadas`, `registrado_en`) VALUES
(10, 32, 12, 1, 0.00, 20, '2026-05-09 06:25:42');

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
(1, 6, 1, 'Maquina_Dañada', 'La máquina de Peck Fly presenta fallas en su funcionamiento y requiere revisión o mantenimiento.', NULL, 0, NULL, NULL, 'Resuelto', 1, 0, '2026-04-14 05:15:01', '2026-04-17 14:36:05'),
(2, 4, 1, 'Maquina_Dañada', 'La caminadora se encuentra descompuesta y la banda no gira.', NULL, 0, NULL, NULL, 'Resuelto', 2, 0, '2026-04-14 05:18:07', '2026-04-17 14:36:40'),
(3, 3, 1, 'Otro', 'Hay un par de mancuernas que se encuentran rotas o en muy mal estado en el área de peso libre, representan un riesgo al entrenar.', NULL, 0, NULL, NULL, 'Resuelto', 0, 0, '2026-04-14 06:06:39', '2026-04-14 06:07:05'),
(4, 12, 1, 'Maquina_Dañada', 'Pec fly', NULL, 1, NULL, NULL, 'Resuelto', 0, 0, '2026-04-28 04:57:17', '2026-04-28 06:03:16'),
(5, 12, 6, 'Problema_Limpieza', 'see cagaron en el bano', NULL, 1, NULL, NULL, 'Abierto', 1, 0, '2026-04-28 05:02:16', '0000-00-00 00:00:00'),
(6, 12, 1, 'Maquina_Dañada', 'Axel come pene', NULL, 0, NULL, NULL, 'Resuelto', 0, 0, '2026-04-28 05:16:47', '2026-04-28 06:03:25'),
(7, 12, 6, 'Maquina_Dañada', 'poncho me mama mucho mi pollita rica', NULL, 0, NULL, NULL, 'Abierto', 1, 0, '2026-04-29 03:14:12', '0000-00-00 00:00:00'),
(8, 12, 1, 'Otro', 'me metio duro last pollita poncho', NULL, 0, NULL, NULL, 'Abierto', 1, 0, '2026-04-29 03:15:19', '0000-00-00 00:00:00'),
(9, 12, 1, 'Baño_Tapado', 'Axel dejo una cagada que lo bautizo rodolfo', NULL, 0, NULL, NULL, 'En_Proceso', 1, 0, '2026-05-03 06:02:11', '0000-00-00 00:00:00'),
(10, 12, 1, 'Maquina_Dañada', 'khfhjk', NULL, 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-06 04:41:29', '0000-00-00 00:00:00'),
(11, 12, 1, 'Maquina_Dañada', 'dsdfsdfs', NULL, 1, NULL, NULL, 'Abierto', 1, 0, '2026-05-06 04:46:06', '0000-00-00 00:00:00'),
(12, 12, 1, 'Maquina_Dañada', 'dfga', '/uploads/reportes/rep_1778042933621.jpg', 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-06 04:48:41', '0000-00-00 00:00:00'),
(13, 12, 1, 'Baño_Tapado', 'Poncho dejo un V end else bano', '/uploads/reportes/rep_1778250972170.jpg', 0, NULL, NULL, 'Abierto', 1, 0, '2026-05-08 14:36:12', '0000-00-00 00:00:00'),
(14, 12, 1, 'Reporte_Personal', 'ese dude me acoso', '/uploads/reportes/rep_1778289187278.jpg', 0, 1, NULL, 'Abierto', 1, 0, '2026-05-09 01:13:07', '0000-00-00 00:00:00'),
(15, 12, 1, 'Reporte_Personal', 'melametio', NULL, 1, 3, NULL, 'Resuelto', 0, 0, '2026-05-09 02:07:24', '2026-05-09 03:18:49'),
(16, 12, 1, 'Reporte_Personal', 'uuu', NULL, 1, 3, NULL, 'Abierto', 1, 0, '2026-05-09 02:49:12', '0000-00-00 00:00:00');

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
(1, 8, 12, '2026-05-02 05:48:58'),
(2, 9, 12, '2026-05-03 06:02:21');

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

--
-- Volcado de datos para la tabla `rutinas`
--

INSERT INTO `rutinas` (`id_rutina`, `id_suscriptor`, `id_entrenador`, `notas_pdf`, `enviada_app`, `creado_en`) VALUES
(1, 3, 1, NULL, 0, '2026-03-28 01:24:29'),
(2, 3, 1, NULL, 0, '2026-03-28 01:25:38'),
(3, 4, 1, NULL, 0, '2026-03-28 01:28:41'),
(4, 8, 1, NULL, 0, '2026-03-28 01:43:27'),
(5, 8, 1, NULL, 0, '2026-03-28 01:44:55'),
(6, 4, 6, NULL, 0, '2026-03-28 04:07:32'),
(7, 10, 8, NULL, 0, '2026-04-02 06:09:40'),
(8, 12, 1, NULL, 0, '2026-04-03 06:37:21'),
(9, 12, 1, NULL, 0, '2026-04-04 06:34:59'),
(10, 12, 1, NULL, 0, '2026-04-04 06:36:13'),
(11, 12, 8, 'Pecho: esto es unicamente para pecho \nEspalda: unicamente espalda', 0, '2026-05-03 22:44:37'),
(12, 12, 1, 'Pecho: nononon', 0, '2026-05-06 19:32:37'),
(13, 12, 1, NULL, 0, '2026-05-08 14:22:14');

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

--
-- Volcado de datos para la tabla `rutina_ejercicios`
--

INSERT INTO `rutina_ejercicios` (`id`, `id_rutina`, `id_ejercicio`, `orden`, `series`, `repeticiones`, `descanso_seg`, `peso_kg`, `descripcion_tecnica`) VALUES
(32, 13, 17, 1, 6, 20, 30, NULL, NULL),
(33, 13, 16, 2, 1, 5, 120, NULL, NULL),
(34, 13, 21, 3, 3, 10, 60, NULL, NULL),
(35, 13, 18, 101, 3, 10, 60, NULL, NULL),
(36, 13, 19, 102, 30, 100, 60, NULL, NULL),
(37, 13, 23, 201, 3, 10, 60, NULL, NULL),
(38, 13, 20, 202, 3, 10, 60, NULL, NULL),
(39, 13, 24, 203, 1, 1, 99, NULL, NULL);

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
(1, 1, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-04-17 02:09:57'),
(2, 5, 1, '{\"personal\":[{\"id\":7,\"nombre\":\"Alfonso Amezcua\",\"puesto\":\"nutriologo\"}]}', '2026-05-02 05:20:14'),
(3, 7, 1, '{\"personal\":[{\"id\":7,\"nombre\":\"Alfonso Amezcua\",\"puesto\":\"nutriologo\"}]}', '2026-05-02 05:20:15'),
(4, 8, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-02 05:20:15'),
(5, 9, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-06 04:21:50'),
(6, 10, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-07 20:15:50'),
(7, 11, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-07 20:15:51'),
(8, 12, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-07 20:15:51'),
(9, 13, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-11 00:02:04'),
(10, 14, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-11 00:02:05'),
(11, 16, 1, '{\"personal\":[{\"id\":1,\"nombre\":\"Axel Adrian Aguirre\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":2,\"nombre\":\"Cristian Alfonso Amezcua\",\"puesto\":\"entrenador_nutriologo\"},{\"id\":3,\"nombre\":\"Alejandro perez\",\"puesto\":\"entrenador\"},{\"id\":4,\"nombre\":\"vanne cortez\",\"puesto\":\"nutriologo\"},{\"id\":8,\"nombre\":\"cristian alfonso  amezcua \",\"puesto\":\"entrenador_nutriologo\"}]}', '2026-05-11 00:02:05');

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
(1, 1, '2026-05-08 14:08:51');

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
(14, 12, 4, NULL, '2026-04-02', '2026-05-01', 3, 0, 'Inactiva', '377488536X335243Y', '2026-04-02 19:02:47'),
(15, 4, NULL, NULL, '2026-04-04', '2026-08-02', 1, 1, 'Inactiva', NULL, '2026-04-04 03:37:48'),
(16, 4, 7, NULL, '2026-08-03', '2026-08-03', 1, 1, 'Inactiva', NULL, '2026-04-04 07:27:58'),
(18, 6, NULL, 6, '2026-04-04', '2026-04-04', 1, 1, 'Activa', NULL, '2026-04-04 07:45:49'),
(19, 6, 7, NULL, '2026-04-06', '2026-04-06', 1, 1, 'Activa', NULL, '2026-04-06 03:31:25'),
(20, 4, 7, NULL, '2026-04-06', '2026-04-06', 1, 1, 'Inactiva', NULL, '2026-04-06 04:12:20'),
(21, 4, NULL, 6, '2026-04-07', '2026-04-07', 1, 1, 'Inactiva', NULL, '2026-04-06 04:12:36'),
(22, 4, 7, NULL, '2026-04-06', '2026-04-06', 1, 1, 'Inactiva', NULL, '2026-04-06 04:12:50'),
(23, 4, NULL, 6, '2026-04-06', '2026-04-06', 1, 1, 'Inactiva', NULL, '2026-04-06 04:38:55'),
(24, 4, NULL, 6, '2026-04-07', '2026-04-07', 1, 1, 'Activa', NULL, '2026-04-07 04:56:08'),
(25, 12, NULL, 3, '2026-04-07', '2026-04-07', 10, 10, 'Inactiva', NULL, '2026-04-07 05:23:14'),
(26, 4, NULL, 6, '2026-04-08', '2026-04-08', 1, 1, 'Activa', NULL, '2026-04-08 05:20:02'),
(27, 4, 7, NULL, '2026-04-09', '2026-04-09', 1, 1, 'Activa', NULL, '2026-04-08 05:20:07'),
(28, 12, NULL, 3, '2026-04-08', '2026-04-08', 5, 7, 'Activa', NULL, '2026-04-08 05:57:26'),
(29, 6, 4, NULL, '2026-04-14', '2026-05-13', 2, 3, 'Activa', '3224848736917333S', '2026-04-14 02:02:29'),
(30, 4, 7, NULL, '2026-04-14', '2026-04-14', 1, 1, 'Inactiva', '8TR98533F1744603H', '2026-04-14 02:06:27'),
(32, 4, 7, NULL, '2026-04-15', '2026-04-15', 1, 1, 'Inactiva', '4SS86590DS232153P', '2026-04-14 04:44:41'),
(33, 4, 7, NULL, '2026-04-14', '2026-04-14', 1, 1, 'Inactiva', '4ET85982F7053003U', '2026-04-14 04:48:39'),
(34, 4, 7, NULL, '2026-04-14', '2026-04-14', 1, 1, 'Inactiva', '3VF41700Y14665604', '2026-04-14 04:54:07'),
(36, 12, 4, NULL, '2026-04-17', '2026-05-16', 0, 3, 'Activa', NULL, '2026-04-17 03:39:41'),
(37, 4, NULL, 6, '2026-04-23', '2026-04-23', 1, 1, 'Activa', NULL, '2026-04-23 01:45:21'),
(38, 12, NULL, 3, '2026-04-28', '2026-04-28', 10, 10, 'Activa', NULL, '2026-04-28 05:42:42'),
(39, 12, 6, NULL, '2026-05-17', '2027-05-16', 10, 10, 'Activa', NULL, '2026-04-28 05:43:46'),
(40, 12, 6, NULL, '2027-05-17', '2028-05-15', 10, 10, 'Activa', '4RM97352AG082492W', '2026-04-28 05:44:36'),
(41, 12, NULL, 3, '2026-04-28', '2026-04-28', 10, 10, 'Activa', NULL, '2026-04-28 05:57:09'),
(42, 4, 7, NULL, '2026-05-02', '2026-05-02', 1, 1, 'Activa', NULL, '2026-05-02 06:27:40'),
(43, 15, 4, NULL, '2026-05-07', '2026-06-05', 2, 3, 'Activa', NULL, '2026-05-07 22:38:56'),
(44, 17, 6, NULL, '2026-05-08', '2027-05-07', 10, 10, 'Activa', '4DL39016VK456810M', '2026-05-08 14:08:07');

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
  `fcm_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscriptores`
--

INSERT INTO `suscriptores` (`id_suscriptor`, `id_sucursal_registro`, `nombres`, `apellido_paterno`, `apellido_materno`, `fecha_nacimiento`, `sexo`, `direccion`, `codigo_postal`, `telefono`, `correo`, `password_hash`, `nfc_uid`, `huella_template`, `puntos`, `racha_dias`, `dias_descanso_semana`, `terminos_aceptados`, `activo`, `creado_en`, `fcm_token`) VALUES
(3, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', 'Paseo de las misiones 1581', '45130', '3317488529', 'axeladrian475@gmail.com', '$2b$12$f2cenS7LsfpxsxrfaRqVDOFG6z9YU49Gqi/9Z7FjqjtOky1mutvL2', NULL, NULL, 2147483647, 0, 0, 1, 0, '2026-03-11 06:32:27', NULL),
(4, 1, 'Cristian Alfonso', 'Amezcua', 'Trejo', '2006-12-31', 'M', 'Andador 17 poniente', '45157', '3323311381', 'alfonsoamezcua31@gmail.com', '$2b$12$KepMtlviw.mrZ672DnzCeOsbMLWA6j6qBF0xWxlu4pyr3kKOVkPaS', NULL, NULL, 2147483647, 0, 0, 1, 1, '2026-03-11 06:33:10', NULL),
(5, 1, 'Pepe', 'toño', 'torres', '2003-06-13', 'M', '1585, 4', '45130', '342523423', 'pepe@gmail.com', '$2b$12$Of8qrD7Oc55EIf/rpDN8pOdAPTceXJXKGHMAhIBUppXIeFQG.P5Cy', NULL, NULL, 2147483647, 0, 0, 1, 0, '2026-03-13 14:19:30', NULL),
(6, 1, 'Susana Elizabeth', 'Ferrer', 'Hernandez', '2006-11-06', 'F', 'mi casas', '45130', '2342343242', 'gusa@gmail.com', '$2b$12$NbejSyIvyX8IjiWtyjE5bOPz0Ua4XWLmGEM3Ezr33L6L66Z3aTgQO', NULL, NULL, 2147483647, 0, 0, 1, 1, '2026-03-13 14:22:43', NULL),
(7, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', 'paseo de las misiones 1585, 4ª', '45130', '3328490929', 'axeladrian4755@gmail.com', '$2b$12$WGBHE8bNfYpl6f5ZulFki.gjbUubMIaW6fjF3VK7LrLaBXiugHcSy', '35:F4:DC:3E', '1', 2147483647, 0, 0, 1, 0, '2026-03-24 01:16:48', NULL),
(8, 1, 'Pepe', 'Ferrer', 'Casas', '2007-01-08', 'M', '1585, 4', '45130', '1111111111', 'axl_agr@sasas.asas', '$2b$12$RLV2cNQ9bMFr/a3uKEgiWekxf52J6ppObVhpdNnvX64fAl2KbQm8u', '84:97:D4:E5', NULL, 2147483647, 0, 0, 1, 0, '2026-03-24 02:53:57', NULL),
(10, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', 'paseo de las misiones 1585, 4ª', '45130', '1111111111', 'axel@axf.com', '$2b$12$0aEfgmO8ju64NiIoKGd0eO8JlC/sHoDdeewe3TxLGzgZCBV/2xf6e', '04:25:1A:1A:49:44:80', '1', 2147481147, 0, 0, 1, 0, '2026-03-28 05:06:55', NULL),
(11, 1, 'Axel Adrian', 'Aguirre', NULL, '2006-03-09', 'M', NULL, NULL, NULL, 'axel@gmail.com', '$2b$12$1JjbAbkpGUYM1y1frgogWepjbIh503WgryWPdDVrCbLA4tcCgEQDu', NULL, NULL, 0, 0, 0, 1, 0, '2026-04-02 06:45:21', NULL),
(12, 1, 'Axel Adrian', 'Aguirre', 'Casas', '2006-07-06', 'M', NULL, NULL, NULL, 'axl_agr@gmail.com', '$2b$12$RovLykthcMLNdiiJ6oTi5eMUKVqaGxXvDzdsVNRL4NoVE0fahuAuS', NULL, NULL, 0, 0, 0, 1, 1, '2026-04-02 19:01:49', NULL),
(15, 1, 'Alana', 'Torina', 'Penendas', '2003-06-12', 'F', 'paseo de las misiones 1585, 4ª', '45130', '0123456789', 'alana@gmail.com', '$2b$12$xcdqXFHS7QLYxf/.A2MxYO6P/IR5DytE88dsP8iTNy/CBzIlMUL/G', 'A3:55:62:4E', NULL, 0, 0, 0, 1, 1, '2026-05-07 22:37:51', NULL),
(17, 1, 'Jimin', 'park', 'ferrer', '1995-10-13', 'M', 'alla por corea', '00000', '0123456789', 'jimin@gmail.com', '$2b$12$Zxc.33sDGw1maqTtAIewsebVo00/qnjIbSACee36Hz8H7BBZtBgCa', '23:ED:42:FA', NULL, 0, 0, 0, 1, 1, '2026-05-08 14:06:49', NULL);

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
(4, 1, 'Mensual', 30, 450.00, 2, 3, 1),
(6, 1, 'Anual', 365, 4000.00, 10, 10, 1),
(7, 1, 'prueba', 1, 1.00, 1, 1, 1);

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
  ADD UNIQUE KEY `uq_registro_serie` (`id_rutina_ejercicio`,`id_suscriptor`,`num_serie`),
  ADD UNIQUE KEY `uq_serie` (`id_rutina_ejercicio`,`id_suscriptor`,`num_serie`),
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
  MODIFY `id_acceso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `id_admin` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `avisos`
--
ALTER TABLE `avisos`
  MODIFY `id_aviso` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `aviso_destinatarios`
--
ALTER TABLE `aviso_destinatarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT de la tabla `canjes`
--
ALTER TABLE `canjes`
  MODIFY `id_canje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `chat_mensajes`
--
ALTER TABLE `chat_mensajes`
  MODIFY `id_mensaje` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=246;

--
-- AUTO_INCREMENT de la tabla `config_reportes_periodicos`
--
ALTER TABLE `config_reportes_periodicos`
  MODIFY `id_config` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT de la tabla `dietas`
--
ALTER TABLE `dietas`
  MODIFY `id_dieta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `dieta_comidas`
--
ALTER TABLE `dieta_comidas`
  MODIFY `id_comida` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT de la tabla `ejercicios`
--
ALTER TABLE `ejercicios`
  MODIFY `id_ejercicio` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `hardware_sesiones`
--
ALTER TABLE `hardware_sesiones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;

--
-- AUTO_INCREMENT de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  MODIFY `id_ingrediente` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id_personal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promocion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `recetas`
--
ALTER TABLE `recetas`
  MODIFY `id_receta` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `receta_ingredientes`
--
ALTER TABLE `receta_ingredientes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `recompensas`
--
ALTER TABLE `recompensas`
  MODIFY `id_recompensa` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `registros_fisicos`
--
ALTER TABLE `registros_fisicos`
  MODIFY `id_registro` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `registro_entrenamiento`
--
ALTER TABLE `registro_entrenamiento`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `reportes`
--
ALTER TABLE `reportes`
  MODIFY `id_reporte` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `reporte_sumados`
--
ALTER TABLE `reporte_sumados`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `rutinas`
--
ALTER TABLE `rutinas`
  MODIFY `id_rutina` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `rutina_ejercicios`
--
ALTER TABLE `rutina_ejercicios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `sensor_huella_posiciones`
--
ALTER TABLE `sensor_huella_posiciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `strikes_reporte`
--
ALTER TABLE `strikes_reporte`
  MODIFY `id_strike` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  MODIFY `id_suscripcion` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT de la tabla `suscriptores`
--
ALTER TABLE `suscriptores`
  MODIFY `id_suscriptor` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `tipos_suscripcion`
--
ALTER TABLE `tipos_suscripcion`
  MODIFY `id_tipo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
