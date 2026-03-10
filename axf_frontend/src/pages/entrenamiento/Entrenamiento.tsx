import { useState } from 'react'
import CargarEjercicio from './secciones/CargarEjercicio'
import CrearRutina from './secciones/CrearRutina'

type Seccion = null | 'ejercicio' | 'rutina'

export default function Entrenamiento() {
  const [seccion, setSeccion] = useState<Seccion>(null)

  if (seccion === 'ejercicio') return <CargarEjercicio onBack={() => setSeccion(null)} />
  if (seccion === 'rutina')    return <CrearRutina     onBack={() => setSeccion(null)} />

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-black mb-1">Módulo de Entrenamiento</h2>
        <hr className="border-gray-300 mb-6" />
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <button onClick={() => setSeccion('ejercicio')}
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:border-[#ea580c] hover:shadow-md transition-all group cursor-pointer">
            <svg className="w-12 h-12 text-[#ea580c] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="font-bold text-black text-sm mb-2">Cargar Ejercicio</p>
            <p className="text-xs text-gray-500">Registrar nuevos ejercicios e imágenes en la base de datos global.</p>
          </button>
          <button onClick={() => setSeccion('rutina')}
            className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center hover:border-[#ea580c] hover:shadow-md transition-all group cursor-pointer">
            <svg className="w-12 h-12 text-[#ea580c] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <p className="font-bold text-black text-sm mb-2">Crear Rutina</p>
            <p className="text-xs text-gray-500">Diseñar planes personalizados, asignar series y generar PDF.</p>
          </button>
        </div>
      </div>
    </div>
  )
}
