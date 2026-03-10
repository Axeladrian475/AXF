import axiosClient from './axiosClient';

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