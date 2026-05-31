import axiosClient from './axiosClient';

// ═══════════════════════════════════════════════════════════════════════════════
//  API — Módulo Nutrición
// ═══════════════════════════════════════════════════════════════════════════════

// ── Ingredientes ──────────────────────────────────────────────────────────────

export interface IngredienteAPI {
  id_ingrediente:    number;
  nombre:            string;
  unidad_medicion:   string;
  /** Cantidad de referencia para los macros (ej: 100 para gramos, 1 para piezas) */
  cantidad_base:     number;
  kcal_base:         number;
  proteinas_base:    number;
  grasas_base:       number;
  carbohidratos_base: number;
}

export const getIngredientes = (): Promise<IngredienteAPI[]> =>
  axiosClient.get('/nutricion/ingredientes').then(r => r.data);

export const crearIngrediente = (data: {
  nombre:             string;
  unidad_medicion:    string;
  cantidad_base:      number;
  kcal_base:          number;
  proteinas_base:     number;
  grasas_base:        number;
  carbohidratos_base: number;
}) => axiosClient.post('/nutricion/ingredientes', data).then(r => r.data);

export const actualizarIngrediente = (id: number, data: {
  nombre:             string;
  unidad_medicion:    string;
  cantidad_base:      number;
  kcal_base:          number;
  proteinas_base:     number;
  grasas_base:        number;
  carbohidratos_base: number;
}) => axiosClient.put(`/nutricion/ingredientes/${id}`, data).then(r => r.data);

export const eliminarIngrediente = (id: number) =>
  axiosClient.delete(`/nutricion/ingredientes/${id}`).then(r => r.data);

// ── Recetas ───────────────────────────────────────────────────────────────────

export interface RecetaAPI {
  id_receta:       number;
  nombre:          string;
  imagen_url:      string | null;
  calorias:        number | null;
  proteinas_g:     number | null;
  grasas_g:        number | null;
  carbohidratos_g: number | null;
  creado_en:       string;
  ingredientes: {
    id_ingrediente:    number;
    nombre:            string;
    cantidad:          number;
    unidad_medicion:   string;
    cantidad_base:     number;
    kcal_base:         number;
    proteinas_base:    number;
    grasas_base:       number;
    carbohidratos_base: number;
  }[];
}

export const getRecetas = (): Promise<RecetaAPI[]> =>
  axiosClient.get('/nutricion/recetas').then(r => r.data);

/** Los macros se calculan en el backend — NO se envían en el body */
export const crearReceta = (data: {
  nombre:       string;
  ingredientes: { id_ingrediente: number; cantidad: number }[];
}) => axiosClient.post('/nutricion/recetas', data).then(r => r.data);

export const actualizarReceta = (id: number, data: {
  nombre:       string;
  ingredientes: { id_ingrediente: number; cantidad: number }[];
}) => axiosClient.put(`/nutricion/recetas/${id}`, data).then(r => r.data);

export const eliminarReceta = (id: number) =>
  axiosClient.delete(`/nutricion/recetas/${id}`).then(r => r.data);

// ── Suscriptores ──────────────────────────────────────────────────────────────

export interface SuscriptorNutricion {
  id_suscriptor:    number;
  nombres:          string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string;
  sexo:             'M' | 'F' | 'Otro';
  sesiones_nutriologo: number;
}

export const getSuscriptoresNutricion = (): Promise<SuscriptorNutricion[]> =>
  axiosClient.get('/nutricion/suscriptores').then(r => r.data);

// ── Registros Físicos ─────────────────────────────────────────────────────────

export interface RegistroFisico {
  id_registro:    number;
  id_suscriptor:  number;
  peso_kg:        number;
  altura_cm:      number;
  edad:           number;
  pct_grasa:      number | null;
  pct_musculo:    number | null;
  actividad:      string | null;
  objetivo:       string | null;
  notas:          string | null;
  tmb:            number | null;
  tdee:           number | null;
  proteinas_min:  number | null;
  proteinas_max:  number | null;
  grasas_min:     number | null;
  grasas_max:     number | null;
  carbs_min:      number | null;
  carbs_max:      number | null;
  nutriologo:     string;
  creado_en:      string;
}

export const getRegistros = (id_suscriptor: number): Promise<RegistroFisico[]> =>
  axiosClient.get(`/nutricion/registros/${id_suscriptor}`).then(r => r.data);

export const crearRegistro = (data: Record<string, unknown>) =>
  axiosClient.post('/nutricion/registros', data).then(r => r.data);

export const eliminarRegistro = (id: number) =>
  axiosClient.delete(`/nutricion/registros/${id}`).then(r => r.data);

// ── Dietas ────────────────────────────────────────────────────────────────────

export const getDieta = (id_suscriptor: number) =>
  axiosClient.get(`/nutricion/dietas/${id_suscriptor}`).then(r => r.data);

export const crearDieta = (data: {
  id_suscriptor: number;
  correo_destino?: string;
  comidas: {
    dia:          number;
    orden_comida: number;
    descripcion?: string;
    id_receta?:   number;
    calorias?:    number;
    notas?:       string;
  }[];
}) => axiosClient.post('/nutricion/dietas', data).then(r => r.data);