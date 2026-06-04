import { useState, useEffect, useRef } from 'react'
import { getEjercicios, crearEjercicio, eliminarEjercicio, actualizarEjercicio } from '../../../api/entrenamientoApi'
import type { EjercicioAPI } from '../../../api/entrenamientoApi'

interface Props { onBack: () => void }

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://axfgymnet.com'

export default function CargarEjercicio({ onBack }: Props) {
  const [nombre, setNombre]         = useState('')
  const [imagen, setImagen]         = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [ejercicios, setEjercicios] = useState<EjercicioAPI[]>([])
  const [cargando, setCargando]     = useState(true)
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState('')
  const [error, setError]           = useState('')

  // ── Modal edición ────────────────────────────────────────────────────────
  const [editando, setEditando]           = useState<EjercicioAPI | null>(null)
  const [editNombre, setEditNombre]       = useState('')
  const [editImagen, setEditImagen]       = useState<File | null>(null)
  const [editPreview, setEditPreview]     = useState<string | null>(null)
  const [editGuardando, setEditGuardando] = useState(false)
  const [editError, setEditError]         = useState('')
  const editFileRef = useRef<HTMLInputElement>(null)

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
      setNombre(''); setImagen(null); setPreview(null)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: number) => {
    if (!confirm('¿Eliminar este ejercicio? También se eliminará de las rutinas donde fue usado.')) return
    try {
      await eliminarEjercicio(id)
      setEjercicios(prev => prev.filter(e => e.id_ejercicio !== id))
      setExito('Ejercicio eliminado correctamente.')
      setTimeout(() => setExito(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar el ejercicio')
      setTimeout(() => setError(''), 4000)
    }
  }

  // ── Edición helpers ───────────────────────────────────────────────────────
  const abrirEditar = (ej: EjercicioAPI) => {
    setEditando(ej)
    setEditNombre(ej.nombre)
    setEditImagen(null)
    setEditPreview(null)
    setEditError('')
  }

  const cerrarEditar = () => {
    setEditando(null)
    setEditNombre('')
    setEditImagen(null)
    setEditPreview(null)
    setEditError('')
  }

  const onEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setEditImagen(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setEditPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setEditPreview(null)
    }
  }

  const guardarEdicion = async () => {
    if (!editando) return
    if (!editNombre.trim()) { setEditError('El nombre es obligatorio'); return }
    setEditError('')
    setEditGuardando(true)
    try {
      const fd = new FormData()
      fd.append('nombre', editNombre.trim())
      if (editImagen) fd.append('imagen', editImagen)
      await actualizarEjercicio(editando.id_ejercicio, fd)
      setExito(`Ejercicio "${editNombre.trim()}" actualizado.`)
      setTimeout(() => setExito(''), 4000)
      cerrarEditar()
      cargar()
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Error al actualizar')
    } finally {
      setEditGuardando(false)
    }
  }

  const imagenActualUrl = editando?.imagen_url ? `${API_BASE}${editando.imagen_url}` : null

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

        {/* Formulario nuevo ejercicio */}
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
                onChange={e => {
                  const file = e.target.files?.[0] ?? null
                  setImagen(file)
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = ev => setPreview(ev.target?.result as string)
                    reader.readAsDataURL(file)
                  } else {
                    setPreview(null)
                  }
                }}
                className="w-full text-sm text-black file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-sm file:font-bold" />
              {preview && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-300 shadow-sm"
                  />
                  <div>
                    <p className="text-xs font-bold text-green-700">✓ Imagen seleccionada</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{imagen?.name}</p>
                    <button
                      type="button"
                      onClick={() => { setImagen(null); setPreview(null) }}
                      className="text-[10px] text-red-400 hover:text-red-600 font-bold mt-0.5"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              )}
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
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(ej)}
                          className="bg-[#1e293b] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#0f172a] transition-colors">
                          ✏️ Editar
                        </button>
                        <button onClick={() => borrar(ej.id_ejercicio)}
                          className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600 transition-colors">
                          Eliminar
                        </button>
                      </div>
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

      {/* ── Modal Editar ──────────────────────────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-black">Editar Ejercicio</h3>
              <button onClick={cerrarEditar} className="text-gray-400 hover:text-black text-xl font-bold leading-none">✕</button>
            </div>

            {/* Preview imagen */}
            <div className="flex justify-center mb-5">
              <div
                className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden flex items-center justify-center relative cursor-pointer group"
                onClick={() => editFileRef.current?.click()}
              >
                {editPreview ? (
                  <img src={editPreview} alt="preview" className="w-full h-full object-cover" />
                ) : imagenActualUrl ? (
                  <img src={imagenActualUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">💪</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="text-white text-xs font-bold text-center leading-tight px-1">📷 Cambiar foto</span>
                </div>
              </div>
            </div>

            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onEditFileChange}
            />

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Nombre del Ejercicio</label>
                <input
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  placeholder="Nombre del ejercicio"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black mb-1">Nueva Imagen (opcional)</label>
                <button
                  type="button"
                  onClick={() => editFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-[#ea580c] text-gray-500 hover:text-[#ea580c] rounded-lg py-2 text-sm font-bold transition-colors">
                  {editImagen ? `📎 ${editImagen.name}` : '📷 Seleccionar nueva imagen'}
                </button>
                {editImagen && (
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Nueva imagen seleccionada ·{' '}
                    <button
                      type="button"
                      onClick={() => { setEditImagen(null); setEditPreview(null) }}
                      className="text-red-400 font-bold hover:text-red-600">
                      quitar
                    </button>
                  </p>
                )}
              </div>
            </div>

            {editError && <p className="text-red-500 text-xs font-bold mb-3">{editError}</p>}

            <div className="flex gap-3">
              <button onClick={cerrarEditar}
                className="flex-1 border border-gray-300 text-black font-bold py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={editGuardando}
                className="flex-1 bg-[#ea580c] text-white font-bold py-2 rounded-lg text-sm hover:bg-[#c94a0a] transition-colors disabled:opacity-50">
                {editGuardando ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}