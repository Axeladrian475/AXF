import axiosClient from './axiosClient';

// ═══════════════════════════════════════════════════════════════════════════════
//  API — Módulo Nutrición
// ═══════════════════════════════════════════════════════════════════════════════

// ── Ingredientes ─────────────────────────────────────────────────────────────

export const getIngredientes = () =>
  axiosClient.get('/nutricion/ingredientes').then(r => r.data);

export const crearIngrediente = (data: { nombre: string; unidad_medicion: string }) =>
  axiosClient.post('/nutricion/ingredientes', data).then(r => r.data);

// ── Recetas ──────────────────────────────────────────────────────────────────

export interface RecetaAPI {
  id_receta: number;
  nombre: string;
  imagen_url: string | null;
  proteinas_g: number | null;
  calorias: number | null;
  grasas_g: number | null;
  creado_en: string;
  ingredientes: { nombre: string; cantidad: number; unidad_medicion: string }[];
}

export const getRecetas = (): Promise<RecetaAPI[]> =>
  axiosClient.get('/nutricion/recetas').then(r => r.data);

export const crearReceta = (data: {
  nombre: string;
  calorias?: string | number;
  proteinas_g?: string | number;
  grasas_g?: string | number;
  ingredientes: { id_ingrediente: number; cantidad: number }[];
}) =>
  axiosClient.post('/nutricion/recetas', data).then(r => r.data);

export const eliminarReceta = (id: number) =>
  axiosClient.delete(`/nutricion/recetas/${id}`).then(r => r.data);

// ── Suscriptores ─────────────────────────────────────────────────────────────

export interface SuscriptorNutricion {
  id_suscriptor: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | 'Otro';
  sesiones_nutriologo: number;
}

export const getSuscriptoresNutricion = (): Promise<SuscriptorNutricion[]> =>
  axiosClient.get('/nutricion/suscriptores').then(r => r.data);

// ── Registros Físicos ────────────────────────────────────────────────────────

export interface RegistroFisico {
  id_registro: number;
  id_suscriptor: number;
  peso_kg: number;
  altura_cm: number;
  edad: number;
  pct_grasa: number | null;
  pct_musculo: number | null;
  actividad: string | null;
  objetivo: string | null;
  notas: string | null;
  tmb: number | null;
  tdee: number | null;
  proteinas_min: number | null;
  proteinas_max: number | null;
  grasas_min: number | null;
  grasas_max: number | null;
  carbs_min: number | null;
  carbs_max: number | null;
  nutriologo: string;
  creado_en: string;
}

export const getRegistros = (id_suscriptor: number): Promise<RegistroFisico[]> =>
  axiosClient.get(`/nutricion/registros/${id_suscriptor}`).then(r => r.data);

export const crearRegistro = (data: Record<string, unknown>) =>
  axiosClient.post('/nutricion/registros', data).then(r => r.data);

export const eliminarRegistro = (id: number) =>
  axiosClient.delete(`/nutricion/registros/${id}`).then(r => r.data);

// ── Dietas ───────────────────────────────────────────────────────────────────

export const getDieta = (id_suscriptor: number) =>
  axiosClient.get(`/nutricion/dietas/${id_suscriptor}`).then(r => r.data);

export const crearDieta = (data: {
  id_suscriptor: number;
  comidas: { dia: number; orden_comida: number; descripcion?: string; id_receta?: number; calorias?: number; notas?: string }[];
}) =>
  axiosClient.post('/nutricion/dietas', data).then(r => r.data);
