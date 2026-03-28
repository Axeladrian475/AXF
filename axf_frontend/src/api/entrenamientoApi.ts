import axiosClient from './axiosClient';

// ═══════════════════════════════════════════════════════════════════════════════
//  API — Módulo Entrenamiento
// ═══════════════════════════════════════════════════════════════════════════════

// ── Ejercicios ───────────────────────────────────────────────────────────────

export interface EjercicioAPI {
  id_ejercicio: number;
  nombre: string;
  imagen_url: string | null;
  creado_en: string;
}

export const getEjercicios = (): Promise<EjercicioAPI[]> =>
  axiosClient.get('/entrenamiento/ejercicios').then(r => r.data);

export const crearEjercicio = (formData: FormData) =>
  axiosClient.post('/entrenamiento/ejercicios', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const actualizarEjercicio = (id: number, formData: FormData) =>
  axiosClient.put(`/entrenamiento/ejercicios/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const eliminarEjercicio = (id: number) =>
  axiosClient.delete(`/entrenamiento/ejercicios/${id}`).then(r => r.data);

// ── Suscriptores ─────────────────────────────────────────────────────────────

export interface SuscriptorEntrenamiento {
  id_suscriptor: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | 'Otro';
  sesiones_entrenador: number;
}

export const getSuscriptoresEntrenamiento = (): Promise<SuscriptorEntrenamiento[]> =>
  axiosClient.get('/entrenamiento/suscriptores').then(r => r.data);

// ── Rutinas ──────────────────────────────────────────────────────────────────

export interface EjercicioRutina {
  id_ejercicio: number;
  orden: number;
  series: number;
  repeticiones: number;
  descanso_seg?: number;
  peso_kg?: number;
  descripcion_tecnica?: string;
}

export const crearRutina = (data: {
  id_suscriptor: number;
  notas_pdf?: string;
  ejercicios: EjercicioRutina[];
}) =>
  axiosClient.post('/entrenamiento/rutinas', data).then(r => r.data);
