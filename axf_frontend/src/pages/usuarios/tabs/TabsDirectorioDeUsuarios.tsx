// ============================================================================
//  pages/usuarios/tabs/TabsDirectorioDeUsuarios.tsx
//  Directorio de suscriptores — datos reales desde la BD, sin mock data.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

// ─── Tipo que coincide con lo que devuelve GET /api/suscriptores ──────────────
interface Suscriptor {
  id_suscriptor:    number
  id_publico:       string        // "00001" → se muestra como "SUS-00001"
  nombre_completo:  string
  correo:           string
  telefono:         string | null
  sucursal_registro: string
}

// ─── Alerta inline ─────────────────────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: {
  tipo: 'exito' | 'error'
  mensaje: string
  onClose: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold mb-4
      ${tipo === 'exito'
        ? 'bg-green-50 border-green-400 text-green-800'
        : 'bg-red-50   border-red-400   text-red-800'}`}
    >
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  )
}

export default function TabsDirectorioDeUsuarios() {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([])  // SIN mock data
  const [busqueda,     setBusqueda]     = useState('')
  const [cargando,     setCargando]     = useState(true)
  const [eliminando,   setEliminando]   = useState<number | null>(null)
  const [alerta, setAlerta]             = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)

  // ── Cargar suscriptores desde la BD ─────────────────────────────────────────
  const cargarSuscriptores = useCallback(async (q = '') => {
    setCargando(true)
    try {
      const { data } = await axiosClient.get<Suscriptor[]>('/suscriptores', {
        params: { q, limite: 100 },
      })
      setSuscriptores(data)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al cargar los suscriptores.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setCargando(false)
    }
  }, [])

  // Carga inicial al montar
  useEffect(() => { cargarSuscriptores() }, [cargarSuscriptores])

  // ── Buscar (en servidor, no solo en local) ───────────────────────────────────
  const handleBuscar = () => cargarSuscriptores(busqueda)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBuscar()
  }

  // ── Eliminar suscriptor ──────────────────────────────────────────────────────
  const handleEliminar = async (s: Suscriptor) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar a "${s.nombre_completo}"?\n\nEsta acción desactivará su cuenta.`
    )
    if (!confirmado) return

    setAlerta(null)
    setEliminando(s.id_suscriptor)
    try {
      const { data } = await axiosClient.delete<{ message: string }>(
        `/suscriptores/${s.id_suscriptor}`
      )
      setAlerta({ tipo: 'exito', mensaje: data.message ?? 'Suscriptor eliminado correctamente.' })
      // Actualizar la tabla sin recargar la página — quitar el registro del estado local
      setSuscriptores(prev => prev.filter(u => u.id_suscriptor !== s.id_suscriptor))
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al eliminar el suscriptor.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setEliminando(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-4">Gestión de Suscriptores</h2>

      {alerta && (
        <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />
      )}

      {/* Barra de búsqueda */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido o ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 py-2 text-sm text-black bg-transparent outline-none"
          />
          {busqueda && (
            <button onClick={() => { setBusqueda(''); cargarSuscriptores('') }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        <button
          onClick={handleBuscar}
          disabled={cargando}
          className="bg-gray-700 text-white font-bold px-6 py-2 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
          Buscar
        </button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
          <span className="w-4 h-4 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
          Cargando suscriptores...
        </div>
      ) : suscriptores.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {busqueda
            ? `No se encontraron suscriptores para "${busqueda}".`
            : 'No hay suscriptores registrados aún.'}
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Nombre Completo</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Correo Electrónico</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Teléfono</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Sucursal (Registro)</th>
              <th className="text-left font-bold text-black pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {suscriptores.map(u => (
              <tr key={u.id_suscriptor} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 text-black font-mono text-xs">
                  SUS-{u.id_publico}
                </td>
                <td className="py-3 pr-4 text-black font-bold">{u.nombre_completo}</td>
                <td className="py-3 pr-4 text-black">{u.correo}</td>
                <td className="py-3 pr-4 text-black">{u.telefono ?? '—'}</td>
                <td className="py-3 pr-4 text-black">{u.sucursal_registro}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                      Modificar
                    </button>
                    <button
                      onClick={() => handleEliminar(u)}
                      disabled={eliminando === u.id_suscriptor}
                      className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1">
                      {eliminando === u.id_suscriptor
                        ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : 'Eliminar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Contador */}
      {!cargando && suscriptores.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">
          {suscriptores.length} suscriptor{suscriptores.length !== 1 ? 'es' : ''} encontrado{suscriptores.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}