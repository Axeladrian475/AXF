// ============================================================================
//  pages/suscriptores/HistorialAccesos.tsx
//  Historial de accesos (entradas/salidas NFC) de un suscriptor específico.
//  Accesible desde SuscriptoresLista via /suscriptores/:id/accesos
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosClient from '../../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Acceso {
  id_acceso:       number
  id_sucursal:     number
  sucursal:        string | null
  metodo:          string
  resultado:       string
  tipo_movimiento: 'Entrada' | 'Salida' | null
  fecha_hora:      string
  fecha:           string
  hora:            string
}

interface Totales {
  total:         number
  permitidos:    number
  denegados:     number
  entradas:      number
  salidas:       number
  ultimo_acceso: string | null
}

interface ApiResponse {
  suscriptor: { id_suscriptor: number; nombre: string }
  totales:    Totales
  accesos:    Acceso[]
  paginacion: { limite: number; offset: number; count: number }
}

type ResultadoFiltro = '' | 'Permitido' | 'Denegado_Sin_Sub' | 'Denegado_No_Encontrado'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Resultado → badge ─────────────────────────────────────────────────────────
const RESULTADO_BADGE: Record<string, { label: string; cls: string; icon: string }> = {
  Permitido:                 { label: 'Permitido',          cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✅' },
  Denegado_Sin_Sub:          { label: 'Sin suscripción',    cls: 'bg-amber-100  text-amber-700  border-amber-200',  icon: '⚠️' },
  Denegado_No_Encontrado:    { label: 'No registrado',      cls: 'bg-red-100    text-red-700    border-red-200',    icon: '🚫' },
}

function ResultadoBadge({ resultado }: { resultado: string }) {
  const conf = RESULTADO_BADGE[resultado] ?? { label: resultado, cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: '❓' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${conf.cls}`}>
      {conf.icon} {conf.label}
    </span>
  )
}

// ── Movimiento → badge ────────────────────────────────────────────────────────
function MovimientoBadge({ movimiento }: { movimiento: string | null }) {
  if (!movimiento) return <span className="text-gray-300 text-xs">—</span>
  const isEntrada = movimiento === 'Entrada'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border
      ${isEntrada
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
      {isEntrada ? '↓ Entrada' : '↑ Salida'}
    </span>
  )
}

function Spinner({ small = false }: { small?: boolean }) {
  const sz = small ? 'w-4 h-4 border-2' : 'w-6 h-6 border-4'
  return <div className={`${sz} border-gray-200 border-t-[#ea580c] rounded-full animate-spin`} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: number | string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</span>
      </div>
      <p className="text-2xl font-black text-black leading-tight">{value}</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function HistorialAccesos() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [data,      setData]      = useState<ApiResponse | null>(null)
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Filtros
  const [desde,     setDesde]     = useState('')
  const [hasta,     setHasta]     = useState('')
  const [resultado, setResultado] = useState<ResultadoFiltro>('')
  const [offset,    setOffset]    = useState(0)
  const LIMITE = 50

  const cargar = useCallback(async (
    d: string, h: string, r: ResultadoFiltro, off: number
  ) => {
    if (!id) return
    setCargando(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { limite: LIMITE, offset: off }
      if (d) params.desde = d
      if (h) params.hasta = h
      if (r) params.resultado = r

      const { data: res } = await axiosClient.get<ApiResponse>(
        `/suscriptores/${id}/accesos`, { params }
      )
      setData(res)
    } catch {
      setError('No se pudo cargar el historial de accesos.')
      setData(null)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => { cargar(desde, hasta, resultado, 0) }, []) // eslint-disable-line

  const aplicarFiltros = () => {
    setOffset(0)
    cargar(desde, hasta, resultado, 0)
  }
  const limpiarFiltros = () => {
    setDesde(''); setHasta(''); setResultado(''); setOffset(0)
    cargar('', '', '', 0)
  }
  const paginaSig = () => {
    const newOff = offset + LIMITE
    setOffset(newOff)
    cargar(desde, hasta, resultado, newOff)
  }
  const paginaAnt = () => {
    const newOff = Math.max(0, offset - LIMITE)
    setOffset(newOff)
    cargar(desde, hasta, resultado, newOff)
  }

  const totales = data?.totales
  const accesos = data?.accesos ?? []
  const nombre  = data?.suscriptor.nombre ?? `Suscriptor #${id}`

  return (
    <div className="p-4 space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/suscriptores')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
            title="Volver"
          >←</button>
          <div>
            <h1 className="text-xl font-black text-black leading-tight">
              Historial de Accesos
            </h1>
            <p className="text-sm text-gray-500 font-medium">{nombre}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ea580c] bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
          🔑 Accesos NFC
        </span>
      </div>

      {/* ── Tarjetas de resumen ──────────────────────────────────────────── */}
      {totales && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon="📊" label="Total accesos"  value={totales.total}      color="text-gray-500" />
          <StatCard icon="✅" label="Permitidos"      value={totales.permitidos} color="text-emerald-600" />
          <StatCard icon="⚠️" label="Denegados"       value={totales.denegados}  color="text-red-500" />
          <StatCard icon="↓"  label="Entradas"        value={totales.entradas}   color="text-blue-600" />
          <StatCard icon="↑"  label="Salidas"         value={totales.salidas}    color="text-purple-600" />
        </div>
      )}
      {totales?.ultimo_acceso && (
        <p className="text-xs text-gray-400 font-medium -mt-2">
          Último acceso registrado: <strong className="text-gray-600">{fmtFechaHora(totales.ultimo_acceso)}</strong>
        </p>
      )}

      {/* ── Panel de filtros ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Filtros</p>
        <div className="flex flex-wrap gap-3 items-end">

          {/* Desde */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30"
            />
          </div>

          {/* Hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30"
            />
          </div>

          {/* Resultado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">Resultado</label>
            <select
              value={resultado}
              onChange={e => setResultado(e.target.value as ResultadoFiltro)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#ea580c]/30"
            >
              <option value="">Todos</option>
              <option value="Permitido">✅ Permitido</option>
              <option value="Denegado_Sin_Sub">⚠️ Sin suscripción</option>
              <option value="Denegado_No_Encontrado">🚫 No registrado</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltros}
              disabled={cargando}
              className="bg-[#ea580c] hover:bg-[#c94a0a] text-white text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {cargando ? <Spinner small /> : '🔍'}
              Filtrar
            </button>
            <button
              onClick={limpiarFiltros}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold px-3 py-1.5 rounded transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          ❌ {error}
        </div>
      )}

      {/* ── Tabla de accesos ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400 text-sm">
            <Spinner /> Cargando historial...
          </div>
        ) : accesos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-gray-500 font-bold text-sm">
              No se encontraron accesos{(desde || hasta || resultado) ? ' con los filtros aplicados' : ''}.
            </p>
            {(desde || hasta || resultado) && (
              <button onClick={limpiarFiltros} className="mt-3 text-[#ea580c] text-xs font-bold hover:underline">
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">#</th>
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">Fecha y Hora</th>
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">Sucursal</th>
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">Metodo</th>
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">Movimiento</th>
                    <th className="text-left text-xs font-black text-gray-500 uppercase tracking-wider px-4 py-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accesos.map((a, i) => (
                    <tr key={a.id_acceso}
                      className={`hover:bg-gray-50 transition-colors ${
                        a.resultado === 'Permitido'
                          ? ''
                          : 'bg-red-50/30'
                      }`}
                    >
                      {/* Número */}
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {offset + i + 1}
                      </td>

                      {/* Fecha y hora */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-black text-sm leading-tight">
                          {fmtFechaCorta(a.fecha_hora)}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{a.hora}</p>
                      </td>

                      {/* Sucursal */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {a.sucursal ?? `Sucursal #${a.id_sucursal}`}
                        </span>
                      </td>

                      {/* Método */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          📡 {a.metodo}
                        </span>
                      </td>

                      {/* Movimiento */}
                      <td className="px-4 py-3">
                        <MovimientoBadge movimiento={a.tipo_movimiento} />
                      </td>

                      {/* Resultado */}
                      <td className="px-4 py-3">
                        <ResultadoBadge resultado={a.resultado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Paginación ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 font-medium">
                Mostrando {offset + 1}–{offset + accesos.length} registros
              </p>
              <div className="flex gap-2">
                <button
                  onClick={paginaAnt}
                  disabled={offset === 0 || cargando}
                  className="text-xs font-bold px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={paginaSig}
                  disabled={accesos.length < LIMITE || cargando}
                  className="text-xs font-bold px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
