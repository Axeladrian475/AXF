import { useState } from 'react'
import RegistroUsuarios from './secciones/RegistroUsuarios'
import CrearDieta from './secciones/CrearDieta'
import CargarReceta from './secciones/CargarReceta'
import CargarIngrediente from './secciones/CargarIngrediente'

type Seccion = null | 'registros' | 'dieta' | 'receta' | 'ingrediente'

const CARDS = [
  {
    id: 'registros' as Seccion,
    icon: (
      <svg className="w-10 h-10 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0M9 12h6m-3-3v6" />
      </svg>
    ),
    titulo: 'Registros Usuarios',
    desc: 'Control detallado de pacientes, medidas antropométricas y cálculo de TDEE/TMB.',
  },
  {
    id: 'dieta' as Seccion,
    icon: (
      <svg className="w-10 h-10 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    titulo: 'Crear Dieta',
    desc: 'Diseñar planes de alimentación personalizados y asignar comidas.',
  },
  {
    id: 'receta' as Seccion,
    icon: (
      <svg className="w-10 h-10 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    titulo: 'Cargar Receta',
    desc: 'Añadir nuevas recetas con valores nutricionales a la base de datos.',
  },
  {
    id: 'ingrediente' as Seccion,
    icon: (
      <svg className="w-10 h-10 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    titulo: 'Cargar Ingrediente',
    desc: 'Registrar nuevos ingredientes individuales para uso en recetas.',
  },
]

export default function Nutricion() {
  const [seccion, setSeccion] = useState<Seccion>(null)

  if (seccion === 'registros')   return <RegistroUsuarios   onBack={() => setSeccion(null)} />
  if (seccion === 'dieta')       return <CrearDieta          onBack={() => setSeccion(null)} />
  if (seccion === 'receta')      return <CargarReceta        onBack={() => setSeccion(null)} />
  if (seccion === 'ingrediente') return <CargarIngrediente   onBack={() => setSeccion(null)} />

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-black mb-1">Módulo de Nutrición</h2>
        <p className="text-sm text-gray-500 mb-6">Seleccione una función para comenzar la gestión nutricional:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CARDS.map(card => (
            <button key={String(card.id)} onClick={() => setSeccion(card.id)}
              className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center text-center hover:border-[#ea580c] hover:shadow-md transition-all group cursor-pointer">
              <div className="mb-3">{card.icon}</div>
              <p className="font-bold text-black text-sm mb-2">{card.titulo}</p>
              <p className="text-xs text-gray-500 leading-snug">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
