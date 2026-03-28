import { useState, useEffect } from 'react'
import { getEjercicios, crearEjercicio, eliminarEjercicio } from '../../../api/entrenamientoApi'
import type { EjercicioAPI } from '../../../api/entrenamientoApi'

interface Props { onBack: () => void }

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

export default function CargarEjercicio({ onBack }: Props) {
  const [nombre, setNombre]         = useState('')
  const [imagen, setImagen]         = useState<File | null>(null)
  const [ejercicios, setEjercicios] = useState<EjercicioAPI[]>([])
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState('')
  const [error, setError]           = useState('')

  const cargar = async () => {
    try {
      setCargando(true)
      const data = await getEjercicios()
      setEjercicios(data)
    } catch { /* silencio */ }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setError('')
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('nombre', nombre.trim())
      if (imagen) fd.append('imagen', imagen)
      await crearEjercicio(fd)
      setExito(`Ejercicio "${nombre.trim()}" guardado.`)
      setTimeout(() => setExito(''), 4000)
      setNombre(''); setImagen(null)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: number) => {
    if (!confirm('¿Eliminar este ejercicio?')) return
    try {
      await eliminarEjercicio(id)
      setEjercicios(prev => prev.filter(e => e.id_ejercicio !== id))
    } catch { /* silencio */ }
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

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg">
            ✅ {exito}
          </div>
        )}

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
                onChange={e => setImagen(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-black file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-sm file:font-bold" />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mb-3 font-bold">{error}</p>}
          <button onClick={guardar} disabled={guardando}
            className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar en Base de Datos'}
          </button>
        </div>

        {/* Lista ejercicios */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-black text-base mb-3">
            Ejercicios Registrados
            <span className="ml-2 text-[#ea580c] font-black">({ejercicios.length})</span>
          </h3>

          {cargando ? (
            <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>
          ) : (
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
                  <tr key={ej.id_ejercicio} className="border-b border-gray-100">
                    <td className="py-3 pr-6">
                      <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                        {ej.imagen_url ? (
                          <img src={`${API_BASE}${ej.imagen_url}`} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-gray-300 text-xs">sin img</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-6 text-black font-bold">{ej.nombre}</td>
                    <td className="py-3">
                      <button onClick={() => borrar(ej.id_ejercicio)}
                        className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {ejercicios.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400 text-xs">No hay ejercicios registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
