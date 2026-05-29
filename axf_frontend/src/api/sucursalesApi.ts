import axiosClient from './axiosClient';

export interface Sucursal {
  id_sucursal: number;
  nombre: string;
  direccion: string;
  codigo_postal: string;
  usuario: string;
  activa: number;
  creado_en: string;
  password_recuperable?: boolean | number;
}

export interface RevelarPasswordResponse {
  password: string;
  segundos: number;
  sucursal: string;
}

export interface SucursalFormData {
  nombre: string;
  direccion: string;
  codigo_postal: string;
  usuario: string;
  password?: string;
}

// Obtener todas las sucursales activas
export const getSucursales = async (): Promise<Sucursal[]> => {
  const response = await axiosClient.get('/sucursales');
  return response.data;
};

/**
 * crearSucursal
 * CORRECCIÓN: El endpoint correcto es POST /api/maestro/sucursales.
 * Antes apuntaba a POST /api/sucursales (ruta genérica sin lógica
 * de validación RQNF3 en backend y sin manejo semántico de errores).
 * El payload que envía React { nombre, direccion, codigo_postal, usuario, password }
 * coincide EXACTAMENTE con lo que desestructura el controlador en Node.js.
 */
export const crearSucursal = async (
  data: SucursalFormData
): Promise<{ success: boolean; message: string; id_sucursal: number }> => {
  const response = await axiosClient.post('/maestro/sucursales', data);
  return response.data;
};

// Modificar sucursal existente
export const modificarSucursal = async (id: number, data: SucursalFormData): Promise<{ message: string }> => {
  const response = await axiosClient.put(`/sucursales/${id}`, data);
  return response.data;
};

// Desactivar sucursal (soft delete) — usa la ruta del rol Maestro
export const eliminarSucursal = async (id: number): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/maestro/sucursales/${id}`);
  return response.data;
};

/** Revela la contraseña de acceso (solo maestro; la UI debe ocultarla tras unos segundos). */
export const revelarPasswordSucursal = async (id: number): Promise<RevelarPasswordResponse> => {
  const response = await axiosClient.get(`/sucursales/${id}/revelar-password`);
  return response.data;
};