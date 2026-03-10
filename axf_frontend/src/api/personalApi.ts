import axiosClient from './axiosClient';

export interface Personal {
  id_personal: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  edad: number;
  sexo: 'M' | 'F' | 'Otro';
  puesto: 'staff' | 'entrenador' | 'nutriologo' | 'entrenador_nutriologo';
  usuario: string;
  foto_url: string | null;
  activo: number;
  creado_en: string;
}

// Obtener todo el personal de la sucursal logueada
export const getPersonal = async (): Promise<Personal[]> => {
  const response = await axiosClient.get('/personal');
  return response.data;
};

// Crear nuevo empleado (usa FormData por la foto)
export const crearPersonal = async (formData: FormData): Promise<{ message: string; id_personal: number }> => {
  const response = await axiosClient.post('/personal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Modificar empleado existente
export const modificarPersonal = async (id: number, formData: FormData): Promise<{ message: string }> => {
  const response = await axiosClient.put(`/personal/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Eliminar empleado
export const eliminarPersonal = async (id: number): Promise<{ message: string }> => {
  const response = await axiosClient.delete(`/personal/${id}`);
  return response.data;
};
