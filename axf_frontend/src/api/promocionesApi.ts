import axiosClient from './axiosClient';

export interface Promocion {
  id_promocion: number;
  nombre: string;
  descripcion: string | null;
  duracion_dias: number;
  precio: number;
  sesiones_nutriologo: number;
  sesiones_entrenador: number;
}

export interface PromocionFormData {
  nombre: string;
  descripcion: string;
  duracion_dias: number | string;
  precio: number | string;
  sesiones_nutriologo: number | string;
  sesiones_entrenador: number | string;
}

export const getPromociones = async (): Promise<Promocion[]> => {
  const response = await axiosClient.get('/promociones');
  return response.data;
};

export const crearPromocion = async (data: PromocionFormData): Promise<{ message: string; id_promocion: number }> => {
  const response = await axiosClient.post('/promociones', data);
  return response.data;
};

export const modificarPromocion = async (id: number, data: PromocionFormData): Promise<{ message: string }> => {
  const response = await axiosClient.put(`/promociones/${id}`, data);
  return response.data;
};

export const eliminarPromocion = async (id: number): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/promociones/${id}`);
  return response.data;
};