-- Correo de contacto de la sucursal para alertas (3er strike y reportes al personal)
ALTER TABLE `sucursales`
  ADD COLUMN `correo` varchar(150) DEFAULT NULL AFTER `usuario`;
