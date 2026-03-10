// Store en memoria – compartido entre CargarReceta y CrearDieta
// En producción esto sería reemplazado por llamadas al backend

export interface Ingrediente {
  nombre: string
  cantidad: string
  unidad: string
}

export interface Receta {
  id: number
  nombre: string
  kcal: number
  proteinas: number
  carbos: number
  grasas: number
  ingredientes: Ingrediente[]
}

// Recetas base con ingredientes detallados
const _recetas: Receta[] = [
  {
    id: 1, nombre: 'Ensalada de Pollo Fit', kcal: 350, proteinas: 35, carbos: 20, grasas: 10,
    ingredientes: [
      { nombre: 'Pechuga de Pollo', cantidad: '150', unidad: 'g' },
      { nombre: 'Lechuga',          cantidad: '100', unidad: 'g' },
      { nombre: 'Tomate Cherry',    cantidad: '50',  unidad: 'g' },
      { nombre: 'Aceite de Oliva',  cantidad: '10',  unidad: 'ml' },
    ],
  },
  {
    id: 2, nombre: 'Batido Post-Entreno', kcal: 480, proteinas: 40, carbos: 55, grasas: 5,
    ingredientes: [
      { nombre: 'Proteína en Polvo', cantidad: '30',  unidad: 'g' },
      { nombre: 'Leche',             cantidad: '300', unidad: 'ml' },
      { nombre: 'Avena',             cantidad: '50',  unidad: 'g' },
      { nombre: 'Plátano',           cantidad: '1',   unidad: 'pz' },
    ],
  },
  {
    id: 3, nombre: 'Avena con Fruta', kcal: 200, proteinas: 8, carbos: 38, grasas: 3,
    ingredientes: [
      { nombre: 'Avena',  cantidad: '60',  unidad: 'g' },
      { nombre: 'Leche',  cantidad: '150', unidad: 'ml' },
      { nombre: 'Fresas', cantidad: '80',  unidad: 'g' },
      { nombre: 'Miel',   cantidad: '10',  unidad: 'g' },
    ],
  },
  {
    id: 4, nombre: 'Hot Cakes de Avena', kcal: 450, proteinas: 20, carbos: 60, grasas: 12,
    ingredientes: [
      { nombre: 'Avena',               cantidad: '80',  unidad: 'g' },
      { nombre: 'Huevo',               cantidad: '2',   unidad: 'pz' },
      { nombre: 'Leche',               cantidad: '100', unidad: 'ml' },
      { nombre: 'Polvo para Hornear',  cantidad: '5',   unidad: 'g' },
    ],
  },
  {
    id: 5, nombre: 'Pollo y Verduras', kcal: 500, proteinas: 40, carbos: 30, grasas: 15,
    ingredientes: [
      { nombre: 'Pechuga de Pollo', cantidad: '200', unidad: 'g' },
      { nombre: 'Brócoli',          cantidad: '100', unidad: 'g' },
      { nombre: 'Zanahoria',        cantidad: '80',  unidad: 'g' },
      { nombre: 'Aceite de Oliva',  cantidad: '15',  unidad: 'ml' },
    ],
  },
  {
    id: 6, nombre: 'Arroz con Atún', kcal: 380, proteinas: 30, carbos: 45, grasas: 8,
    ingredientes: [
      { nombre: 'Arroz Blanco',  cantidad: '150', unidad: 'g' },
      { nombre: 'Atún en Lata',  cantidad: '120', unidad: 'g' },
      { nombre: 'Limón',         cantidad: '1',   unidad: 'pz' },
      { nombre: 'Aceite Oliva',  cantidad: '5',   unidad: 'ml' },
    ],
  },
]

let _nextId = 7

export const getRecetas = (): Receta[] => [..._recetas]

export const agregarReceta = (r: Omit<Receta, 'id'>): Receta => {
  const nueva = { ...r, id: _nextId++ }
  _recetas.push(nueva)
  return nueva
}

// Genera el texto descriptivo para pegar en el textarea de la dieta
export const textoIngredientes = (r: Receta): string => {
  const lista = r.ingredientes
    .map(i => `• ${i.nombre}: ${i.cantidad} ${i.unidad}`)
    .join('\n')
  return `📋 ${r.nombre} (${r.kcal} Kcal | ${r.proteinas}g prot)\n${lista}`
}
