import { useState } from 'react'
interface Props { onBack: () => void }

const MOCK_EJERCICIOS = [
  { id: 1, nombre: 'Sentadilla Libre', img: null },
]

export default function CargarEjercicio({ onBack }: Props) {
  const [nombre, setNombre] = useState('')
  const [ejercicios, setEjercicios] = useState(MOCK_EJERCICIOS)

  const guardar = () => {
    if (!nombre.trim()) return
    setEjercicios(prev => [...prev, { id: Date.now(), nombre, img: null }])
    setNombre('')
  }

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Cargar Ejercicio</h2>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 max-w-lg">
          <h3 className="font-bold text-black text-base mb-4">Nuevo Ejercicio</h3>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-black mb-1">Nombre del Ejercicio</label>
              <input placeholder="Ej. Press de Banca Plano" value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1">Cargar Imagen de Referencia</label>
              <input type="file" accept="image/*"
                className="w-full text-sm text-black file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-sm file:font-bold" />
            </div>
          </div>
          <button onClick={guardar}
            className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm">
            Guardar en Base de Datos
          </button>
        </div>

        {/* Lista ejercicios */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-black text-base mb-3">Ejercicios Registrados</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left font-bold text-black pb-2 pr-6 w-20">Imagen</th>
                <th className="text-left font-bold text-black pb-2 pr-6">Nombre</th>
                <th className="text-left font-bold text-black pb-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ejercicios.map(ej => (
                <tr key={ej.id} className="border-b border-gray-100">
                  <td className="py-3 pr-6">
                    <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      {ej.img ? <img src={ej.img} alt="" className="w-full h-full object-cover rounded" /> : <span className="text-gray-300 text-xs">sin img</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-6 text-black font-bold">{ej.nombre}</td>
                  <td className="py-3">
                    <button className="border border-gray-400 text-black text-xs font-bold px-3 py-1 rounded hover:bg-gray-100">
                      Modificar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
