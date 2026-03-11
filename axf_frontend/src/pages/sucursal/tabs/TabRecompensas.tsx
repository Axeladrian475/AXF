import { useState, useEffect } from 'react'
import axiosClient from '../../../api/axiosClient'

interface Recompensa {
  id_recompensa: number
  nombre: string
  costo_puntos: number
}

// ─── Alerta reutilizable ──────────────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: {
  tipo: 'exito' | 'error'
  mensaje: string
  onClose: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-bold mb-4
      ${tipo === 'exito'
        ? 'bg-green-50 border-green-400 text-green-800'
        : 'bg-red-50 border-red-400 text-red-800'}`}
    >
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

export default function TabRecompensas() {
  // ── Catálogo ────────────────────────────────────────────────────────────────
  const [recompensas, setRecompensas] = useState<Recompensa[]>([])
  const [cargando,    setCargando]    = useState(true)

  // ── Formulario agregar / editar ─────────────────────────────────────────────
  const [nombre,      setNombre]      = useState('')
  const [puntos,      setPuntos]      = useState('')
  const [editando,    setEditando]    = useState<Recompensa | null>(null)
  const [guardando,   setGuardando]   = useState(false)

  // ── Feedback ────────────────────────────────────────────────────────────────
  const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)

  // ── Cargar recompensas al montar ────────────────────────────────────────────
  useEffect(() => { cargarRecompensas() }, [])

  const cargarRecompensas = async () => {
    setCargando(true)
    try {
      const { data } = await axiosClient.get<Recompensa[]>('/recompensas')
      setRecompensas(data)
    } catch {
      setAlerta({ tipo: 'error', mensaje: 'Error al cargar las recompensas.' })
    } finally {
      setCargando(false)
    }
  }

  // ── Iniciar edición ─────────────────────────────────────────────────────────
  const iniciarEdicion = (r: Recompensa) => {
    setEditando(r)
    setNombre(r.nombre)
    setPuntos(String(r.costo_puntos))
    setAlerta(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
    setPuntos('')
  }

  // ── Guardar (crear o actualizar) ────────────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)

    if (!nombre.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El nombre de la recompensa es requerido.' })
      return
    }
    if (!puntos || parseInt(puntos) <= 0) {
      setAlerta({ tipo: 'error', mensaje: 'El costo en puntos debe ser mayor a 0.' })
      return
    }

    setGuardando(true)
    try {
      if (editando) {
        // ── PUT: modificar ──────────────────────────────────────────────────
        const { data } = await axiosClient.put<{ message: string }>(
          `/recompensas/${editando.id_recompensa}`,
          { nombre: nombre.trim(), costo_puntos: parseInt(puntos) }
        )
        setAlerta({ tipo: 'exito', mensaje: data.message })
        cancelarEdicion()
      } else {
        // ── POST: crear ─────────────────────────────────────────────────────
        const { data } = await axiosClient.post<{ message: string }>(
          '/recompensas',
          { nombre: nombre.trim(), costo_puntos: parseInt(puntos) }
        )
        setAlerta({ tipo: 'exito', mensaje: data.message })
        setNombre('')
        setPuntos('')
      }
      await cargarRecompensas()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al guardar la recompensa.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setGuardando(false)
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────────
  const handleEliminar = async (r: Recompensa) => {
    if (!window.confirm(`¿Eliminar la recompensa "${r.nombre}"?`)) return
    setAlerta(null)
    try {
      const { data } = await axiosClient.delete<{ message: string }>(`/recompensas/${r.id_recompensa}`)
      setAlerta({ tipo: 'exito', mensaje: data.message })
      await cargarRecompensas()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al eliminar la recompensa.'
      setAlerta({ tipo: 'error', mensaje: msg })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Configuración de Recompensas por Puntos</h2>
      <hr className="border-gray-300 mb-4" />

      {alerta && (
        <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />
      )}

      {/* Formulario */}
      <p className="text-sm font-bold text-black mb-3">
        {editando ? `Modificar: ${editando.nombre}` : 'Agregar Nueva Recompensa'}
      </p>
      <form className="mb-6" onSubmit={handleGuardar}>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">
              Nombre de la Recompensa:
            </label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              disabled={guardando}
              placeholder="Ej. Botella de agua AxF"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">
              Costo en Puntos:
            </label>
            <input
              type="number"
              min="1"
              value={puntos}
              onChange={e => setPuntos(e.target.value)}
              disabled={guardando}
              placeholder="Ej. 500"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black disabled:opacity-60"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-[#ea580c] text-white font-bold px-4 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {guardando && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editando ? 'Actualizar' : 'Guardar Recompensa'}
            </button>
            {editando && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="px-4 py-2 rounded border border-gray-400 text-black font-bold hover:bg-gray-100 text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Tabla */}
      <p className="text-sm font-bold text-black mb-2">Recompensas Disponibles para Canje</p>
      <div className="overflow-x-auto">
        {cargando ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <span className="w-4 h-4 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
            Cargando recompensas...
          </div>
        ) : recompensas.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No hay recompensas registradas aún.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-[#fecaca]">
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Nombre</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Costo en Puntos</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recompensas.map(r => (
                <tr key={r.id_recompensa} className={`bg-white ${editando?.id_recompensa === r.id_recompensa ? 'ring-2 ring-[#ea580c] ring-inset' : ''}`}>
                  <td className="border border-gray-400 px-3 py-2 text-black">{r.nombre}</td>
                  <td className="border border-gray-400 px-3 py-2 text-black font-bold">{r.costo_puntos.toLocaleString()} pts</td>
                  <td className="border border-gray-400 px-3 py-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => iniciarEdicion(r)}
                        className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a] transition-colors"
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => handleEliminar(r)}
                        className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-yellow-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}