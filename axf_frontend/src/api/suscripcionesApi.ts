import axiosClient from './axiosClient';

// ─── Tipos de Suscripción (planes) ───────────────────────────────────────────
export interface TipoSuscripcion {
  id_tipo: number;
  nombre: string;
  duracion_dias: number;
  precio: number;
  limite_sesiones_nutriologo: number;
  limite_sesiones_entrenador: number;
}

export interface TipoSuscripcionFormData {
  nombre: string;
  duracion_dias: number | string;
  precio: number | string;
  limite_sesiones_nutriologo: number | string;
  limite_sesiones_entrenador: number | string;
}

export const getSuscripciones = async (): Promise<TipoSuscripcion[]> => {
  const response = await axiosClient.get('/suscripciones');
  return response.data;
};

export const crearSuscripcion = async (data: TipoSuscripcionFormData): Promise<{ message: string; id_tipo: number }> => {
  const response = await axiosClient.post('/suscripciones', data);
  return response.data;
};

export const modificarSuscripcion = async (id: number, data: TipoSuscripcionFormData): Promise<{ message: string }> => {
  const response = await axiosClient.put(`/suscripciones/${id}`, data);
  return response.data;
};

export const eliminarSuscripcion = async (id: number): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/suscripciones/${id}`);
  return response.data;
};

// ─── Suscriptores ─────────────────────────────────────────────────────────────
export interface SuscriptorResumen {
  id_suscriptor: number;
  id_publico: string;
  nombre_completo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  correo: string;
  telefono: string | null;
  sucursal_registro: string;
  id_sucursal_registro?: number;
  activo: number;
  puntos: number;
  creado_en: string;
}

export interface SuscripcionItem {
  id_suscripcion: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  sesiones_nutriologo_restantes: number;
  sesiones_entrenador_restantes: number;
  mp_payment_id: string | null;
  plan_nombre: string;
  plan_duracion_dias: number;
  plan_precio: number;
  creado_en: string;
}

export interface SuscripcionActiva {
  activa: boolean;
  suscripciones: SuscripcionItem[];
  vigente?: SuscripcionItem;           // la que corre actualmente (inicio más temprano)
  vencimiento_final?: string;          // fecha_fin de la última acumulada
  totales?: {
    sesiones_nutriologo: number;
    sesiones_entrenador: number;
  };
}

// Listar suscriptores locales (de la sucursal actual)
export const getSuscriptoresLocales = async (q = ''): Promise<SuscriptorResumen[]> => {
  const response = await axiosClient.get('/suscriptores', { params: { q, limite: 200 } });
  return response.data;
};

// Listar suscriptores de otras sucursales
export const getSuscriptoresOtrasSucursales = async (q = ''): Promise<SuscriptorResumen[]> => {
  const response = await axiosClient.get('/suscriptores/otras-sucursales', { params: { q, limite: 200 } });
  return response.data;
};

// Migrar suscriptor a la sucursal actual
export const migrarSuscriptor = async (id: number): Promise<{ message: string; id_suscriptor: number }> => {
  const response = await axiosClient.post(`/suscriptores/${id}/migrar`);
  return response.data;
};

// Obtener suscripción activa de un suscriptor
export const getSuscripcionActiva = async (id: number): Promise<SuscripcionActiva> => {
  const response = await axiosClient.get(`/suscriptores/${id}/suscripcion-activa`);
  return response.data;
};

// Suscribir a un suscriptor a un plan
export const suscribirSuscriptor = async (
  id: number,
  data: { id_tipo: number; fecha_inicio?: string; mp_payment_id?: string | null }
): Promise<{ message: string; id_suscripcion: number; fecha_inicio: string; fecha_fin: string; acumulada: boolean }> => {
  const response = await axiosClient.post(`/suscriptores/${id}/suscribir`, data);
  return response.data;
};