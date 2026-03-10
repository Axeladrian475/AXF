interface Props { onBack: () => void }
import { useState } from 'react'

const UNIDADES = ['Gramos (g)', 'Mililitros (ml)', 'Piezas (pz)', 'Tazas (tz)', 'Cucharadas (cdas)']

export default function CargarIngrediente({ onBack }: Props) {
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('Piezas (pz)')
  const [calorias, setCalorias] = useState('')

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Cargar Ingrediente</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xs mx-auto">
          <h3 className="font-bold text-black text-base mb-1">Nuevo Ingrediente</h3>
          <p className="text-xs text-gray-500 mb-4">Agregue ingredientes base para usarlos en las recetas.</p>

          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-black mb-1">Nombre del Ingrediente</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1">Unidad de Medida</label>
              <select value={unidad} onChange={e => setUnidad(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm">
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1">Calorías por unidad</label>
              <input type="number" value={calorias} onChange={e => setCalorias(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
            </div>
          </div>

          <button className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm">
            Agregar a Base de Datos
          </button>
        </div>
      </div>
    </div>
  )
}
