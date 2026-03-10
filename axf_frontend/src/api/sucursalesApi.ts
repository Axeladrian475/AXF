import axiosClient from './axiosClient';

export interface Sucursal {
  id_sucursal: number;
  nombre: string;
  direccion: string;
  codigo_postal: string;
  usuario: string;
  activa: number;
  creado_en: string;
}

export interface SucursalFormData {
  nombre: string;
  direccion: string;
  codigo_postal: string;
  usuario: string;
  password?: string;
}

// Obtener todas las sucursales
export const getSucursales = async (): Promise<Sucursal[]> => {
  const response = await axiosClient.get('/sucursales');
  return response.data;
};

// Crear nueva sucursal
export const crearSucursal = async (data: SucursalFormData): Promise<{ message: string; id_sucursal: number }> => {
  const response = await axiosClient.post('/sucursales', data);
  return response.data;
};

// Modificar sucursal existente
export const modificarSucursal = async (id: number, data: SucursalFormData): Promise<{ message: string }> => {
  const response = await axiosClient.put(`/sucursales/${id}`, data);
  return response.data;
};

// Desactivar sucursal (soft delete)
export const eliminarSucursal = async (id: number): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/sucursales/${id}`);
  return response.data;
};