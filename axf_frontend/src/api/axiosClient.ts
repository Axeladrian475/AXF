import axios from 'axios';

const axiosClient = axios.create({
  // URL base de tu backend
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

console.log('URL BASE DE AXIOS:', axiosClient.defaults.baseURL); // <-- Agrega esto

// Interceptor para inyectar el token en cada petición
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;