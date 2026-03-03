import axiosClient from './axiosClient';

export const loginSucursal = async (usuario: string, password: string) => {
  const response = await axiosClient.post('/auth/login', { usuario, password });
  return response.data;
};