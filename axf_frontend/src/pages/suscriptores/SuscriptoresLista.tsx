// ============================================================================
//  pages/suscriptores/SuscriptoresLista.tsx
//  Vista dedicada de suscriptores Activos / Inactivos
//  Accesible desde los contadores del Dashboard.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axiosClient from '../../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Suscriptor {
  id_suscriptor:    number
  id_publico:       string
  nombre_completo:  string
  nombres:          string
  apellido_paterno: string
  correo:           string
  telefono:         string | null
  puntos:           number
  creado_en:        string
  sucursal_registro: string
  foto_url:         string | null
  // extra que agregamos al listar con filtro
  fecha_fin_suscripcion?: string | null
  plan_nombre?:           string | null
}

type Filtro = 'activo' | 'inactivo'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric' })
}

function Spinner({ small = false }: { small?: boolean }) {
  const sz = small ? 'w-4 h-4 border-2' : 'w-6 h-6 border-4'
  return <div className={`${sz} border-gray-300 border-t-[#ea580c] rounded-full animate-spin`} />
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function SuscriptoresLista() {
  const navigate                       = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filtroParam = (searchParams.get('filtro') ?? 'activo') as Filtro
  const [filtro, setFiltro]         = useState<Filtro>(filtroParam)
  const [busqueda, setBusqueda]     = useState('')
  const [suscriptores, setSusc]     = useState<Suscriptor[]>([])
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Cambiar tab actualiza la URL
  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f)
    setBusqueda('')
    setSearchParams({ filtro: f })
  }

  const cargar = useCallback(async (q: string, f: Filtro) => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await axiosClient.get<Suscriptor[]>('/suscriptores', {
        params: { q, limite: 200, filtro: f },
      })
      setSusc(data)
    } catch {
      setError('No se pudo cargar la lista.')
      setSusc([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar('', filtro) }, [filtro])     // eslint-disable-line

  const handleBuscar = () => cargar(busqueda, filtro)
  const handleKey    = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleBuscar() }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">

        {/* ── Encabezado + botón volver ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-black">Listado de Suscriptores</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-1"
          >
            ← Volver al inicio
          </button>
        </div>

        {/* ── Tabs Activos / Inactivos ──────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => cambiarFiltro('activo')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all flex items-center gap-2
              ${filtro === 'activo'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}
          >
            <span className={`w-2 h-2 rounded-full ${filtro === 'activo' ? 'bg-white' : 'bg-green-500'}`} />
            Activos
            {filtro === 'activo' && !cargando && (
              <span className="bg-white/30 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {suscriptores.length}
              </span>
            )}
          </button>

          <button
            onClick={() => cambiarFiltro('inactivo')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all flex items-center gap-2
              ${filtro === 'inactivo'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}
          >
            <span className={`w-2 h-2 rounded-full ${filtro === 'inactivo' ? 'bg-white' : 'bg-red-500'}`} />
            Inactivos
            {filtro === 'inactivo' && !cargando && (
              <span className="bg-white/30 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {suscriptores.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Banner contextual ─────────────────────────────────────────── */}
        <div className={`rounded-lg px-4 py-2.5 mb-5 text-sm font-bold flex items-center gap-2
          ${filtro === 'activo'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'}`}
        >
          {filtro === 'activo'
            ? '🟢 Suscriptores con suscripción vigente actualmente.'
            : '🔴 Suscriptores sin suscripción activa — podrían necesitar renovación.'}
        </div>

        {/* ── Barra búsqueda ────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
            <span className="text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, correo o ID..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={handleKey}
              className="flex-1 py-2 text-sm text-black bg-transparent outline-none"
            />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); cargar('', filtro) }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>
          <button
            onClick={handleBuscar}
            disabled={cargando}
            className="bg-gray-700 text-white font-bold px-5 py-2 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        {cargando ? (
          <div className="flex items-center justify-center gap-3 py-14 text-gray-400 text-sm">
            <Spinner /> Cargando suscriptores...
          </div>
        ) : suscriptores.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-3">{filtro === 'activo' ? '✅' : '💤'}</p>
            <p className="text-gray-500 font-bold text-sm">
              {busqueda
                ? `No se encontraron resultados para "${busqueda}".`
                : filtro === 'activo'
                  ? 'No hay suscriptores con suscripción activa actualmente.'
                  : 'No hay suscriptores inactivos actualmente.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left font-bold text-black pb-2 pr-3 w-12">Foto</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">Nombre</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">Correo</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">Teléfono</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">Puntos</th>
                    <th className="text-left font-bold text-black pb-2 pr-4">Registro</th>
                    <th className="text-left font-bold text-black pb-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {suscriptores.map(s => (
                    <tr key={s.id_suscriptor}
                      className="border-b border-gray-100 hover:bg-white transition-colors">

                      {/* Foto */}
                      <td className="py-2 pr-3">
                        {s.foto_url ? (
                          <img
                            src={`${(import.meta.env.VITE_API_URL ?? 'https://axfgymnet.com').replace('/api', '')}${s.foto_url}`}
                            alt={s.nombre_completo}
                            className="w-9 h-9 rounded-full object-cover border-2 border-[#ea580c]/30"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm border-2 border-gray-300">
                            {s.nombre_completo.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>

                      {/* ID */}
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          SUS-{s.id_publico}
                        </span>
                      </td>

                      {/* Nombre */}
                      <td className="py-3 pr-4">
                        <p className="text-black font-bold text-sm">{s.nombre_completo}</p>
                      </td>

                      {/* Correo */}
                      <td className="py-3 pr-4 text-gray-600 text-xs">{s.correo}</td>

                      {/* Teléfono */}
                      <td className="py-3 pr-4 text-gray-600 text-xs">{s.telefono ?? '—'}</td>

                      {/* Puntos */}
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#ea580c]">
                          ⭐ {s.puntos ?? 0}
                        </span>
                      </td>

                      {/* Fecha registro */}
                      <td className="py-3 pr-4 text-gray-400 text-xs">{fmtFecha(s.creado_en)}</td>

                      {/* Acción */}
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/suscripciones?suscriptor=${s.id_suscriptor}&nombre=${encodeURIComponent(s.nombre_completo)}`)}
                            className={`text-white text-xs font-bold px-3 py-1.5 rounded transition-colors
                              ${filtro === 'activo'
                                ? 'bg-[#1e293b] hover:bg-[#0f172a]'
                                : 'bg-[#ea580c] hover:bg-[#c94a0a]'}`}
                          >
                            {filtro === 'activo' ? 'Ver suscripción' : 'Suscribir →'}
                          </button>
                          <button
                            onClick={() => navigate(`/suscriptores/${s.id_suscriptor}/accesos`)}
                            title="Historial de accesos"
                            className="text-gray-500 hover:text-[#ea580c] text-xs font-bold px-2.5 py-1.5 rounded border border-gray-200 hover:border-[#ea580c] bg-white transition-colors"
                          >
                            🔑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-gray-400 text-xs mt-3 text-right">
              {suscriptores.length} suscriptor{suscriptores.length !== 1 ? 'es' : ''} {filtro === 'activo' ? 'activo' : 'inactivo'}{suscriptores.length !== 1 ? 's' : ''}.
            </p>
          </>
        )}

      </div>
    </div>
  )
}