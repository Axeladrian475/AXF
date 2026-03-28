import { useState, useEffect } from 'react'
import { getIngredientes, crearIngrediente } from '../../../api/nutricionApi'

interface Props { onBack: () => void }

const UNIDADES = ['g', 'ml', 'pz', 'tz', 'cdas']

interface IngredienteDB {
  id_ingrediente: number
  nombre: string
  unidad_medicion: string
}

export default function CargarIngrediente({ onBack }: Props) {
  const [nombre, setNombre]       = useState('')
  const [unidad, setUnidad]       = useState('g')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [error, setError]         = useState('')
  const [lista, setLista]         = useState<IngredienteDB[]>([])
  const [cargando, setCargando]   = useState(true)

  const cargar = async () => {
    try {
      setCargando(true)
      const data = await getIngredientes()
      setLista(data)
    } catch { /* silencio */ }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setError('')
    setGuardando(true)
    try {
      await crearIngrediente({ nombre: nombre.trim(), unidad_medicion: unidad })
      setExito(`Ingrediente "${nombre.trim()}" agregado correctamente.`)
      setTimeout(() => setExito(''), 4000)
      setNombre('')
      setUnidad('g')
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar ingrediente')
    } finally {
      setGuardando(false)
    }
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
          <h2 className="text-xl font-bold text-black">Cargar Ingrediente</h2>
        </div>

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg">
            ✅ {exito}
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {/* Formulario */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-black text-base mb-1">Nuevo Ingrediente</h3>
            <p className="text-xs text-gray-500 mb-4">Agregue ingredientes base para usarlos en las recetas.</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Nombre del Ingrediente</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Pechuga de Pollo"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Unidad de Medida</label>
                <select value={unidad} onChange={e => setUnidad(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm">
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mb-3 font-bold">{error}</p>}

            <button onClick={guardar} disabled={guardando}
              className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Agregar a Base de Datos'}
            </button>
          </div>

          {/* Lista existentes */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-black text-base mb-1">
              Ingredientes en BD
              <span className="ml-2 text-[#ea580c] font-black">({lista.length})</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">Disponibles para uso en recetas.</p>

            {cargando ? (
              <p className="text-xs text-gray-400 py-4 text-center">Cargando...</p>
            ) : (
              <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
                {lista.map(ing => (
                  <div key={ing.id_ingrediente}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-bold text-black">{ing.nombre}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{ing.unidad_medicion}</span>
                  </div>
                ))}
                {lista.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No hay ingredientes registrados</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
