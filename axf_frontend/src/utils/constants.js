// Puestos del personal (coincide con el ENUM de la BD)
export const PUESTOS = [
  { value: 'staff',                    label: 'Staff / Recepcionista' },
  { value: 'entrenador',               label: 'Entrenador' },
  { value: 'nutriologo',               label: 'Nutriólogo' },
  { value: 'entrenador_nutriologo',    label: 'Entrenador y Nutriólogo' },
];

// Categorías de reportes (coincide con el ENUM de la BD)
export const CATEGORIAS_REPORTE = [
  { value: 'Maquina_Dañada',    label: 'Máquina dañada' },
  { value: 'Baño_Tapado',       label: 'Baño tapado' },
  { value: 'Problema_Limpieza', label: 'Problema de limpieza' },
  { value: 'Reporte_Personal',  label: 'Reporte de personal' },
  { value: 'Otro',              label: 'Otro' },
];

// Niveles de actividad física (para registros físicos)
export const NIVELES_ACTIVIDAD = [
  { value: 'Sedentario',              label: 'Sedentario (sin ejercicio)' },
  { value: 'Ligeramente_Activo',      label: 'Ligeramente activo (1-3 días/semana)' },
  { value: 'Moderadamente_Activo',    label: 'Moderadamente activo (3-5 días)' },
  { value: 'Muy_Activo',              label: 'Muy activo (6-7 días)' },
  { value: 'Extremadamente_Activo',   label: 'Extremadamente activo (trabajo físico)' },
];

// Estados posibles de una suscripción
export const ESTADOS_SUSCRIPCION = {
  ACTIVA:    'Activa',
  INACTIVA:  'Inactiva',
  PENDIENTE: 'Pendiente',
};

// Roles del sistema (coincide con el payload del JWT)
export const ROLES = {
  MAESTRO:   'maestro',
  SUCURSAL:  'sucursal',
  PERSONAL:  'personal',
  SUSCRIPTOR:'suscriptor',
};

// Días de la semana (para la configuración de rachas)
export const DIAS_SEMANA = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' }, { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
];

// Métodos de acceso del ESP32
export const METODOS_ACCESO = {
  NFC:    'NFC',
  HUELLA: 'Huella',
};

// Resultados posibles de un acceso
export const RESULTADOS_ACCESO = {
  PERMITIDO:       'Permitido',
  SIN_SUB:         'Denegado_Sin_Sub',
  NO_ENCONTRADO:   'Denegado_No_Encontrado',
};
