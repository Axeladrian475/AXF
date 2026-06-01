// ============================================================================
//  pages/reportes/tabs/TabsReportesPrioritarios.tsx
//  Vista exclusiva para el usuario SUCURSAL — reportes con 3+ strikes
//  que siguen sin ser resueltos. Permite dar seguimiento directo.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReportePrioritario {
  id_reporte:                number
  categoria:                 string
  descripcion:               string
  foto_url:                  string | null
  es_privado:                number
  estado:                    'Abierto' | 'En_Proceso' | 'Resuelto'
  num_strikes:               number
  reenviado_sucursal:        number
  creado_en:                 string
  nombre_suscriptor:         string
  correo_suscriptor:         string
  nombre_sucursal:           string
  horas_desde_creacion:      number
  nombre_personal_reportado: string | null
  puesto_personal_reportado: string | null
  foto_personal_reportado:   string | null
  ultimo_strike_en:          string | null
  en_proceso_por_nombre:       string | null
  resuelto_por_nombre:         string | null
}

interface Strike {
  id_strike:       number
  nivel:           number
  notificados:     string
  generado_en:     string
  horas_al_strike: number
}

// ─── Config visual ────────────────────────────────────────────────────────────

const STRIKE_CONFIG: Record<number, { dot: string; badge: string; label: string }> = {
  0: { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',   label: 'Sin alerta' },
  1: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',    label: '1er Strike' },
  2: { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', label: '2do Strike' },
  3: { dot: 'bg-red-600',     badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',          label: '3er Strike' },
}

const ESTADO_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  Abierto:    { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',         label: 'Abierto' },
  En_Proceso: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     label: 'En Proceso' },
  Resuelto:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Resuelto' },
}

const CATEGORIA_LABEL: Record<string, string> = {
  Maquina_Dañada:    'Máquina Dañada',
  Baño_Tapado:       'Baño Tapado',
  Problema_Limpieza: 'Limpieza',
  Reporte_Personal:  'Reporte de Personal',
  Otro:              'Otro',
}

const CATEGORIA_ICON: Record<string, string> = {
  Maquina_Dañada:    '⚙️',
  Baño_Tapado:       '🚿',
  Problema_Limpieza: '🧹',
  Reporte_Personal:  '👤',
  Otro:              '📌',
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatFechaSplit(iso: string) {
  const date = new Date(iso)
  const d = date.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', year: 'numeric' })
  const t = date.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })
  return { d, t }
}

// ─── Componentes modales base ─────────────────────────────────────────────────

function Modal({ children, onClose, maxWidth = 'max-w-md' }: { children: React.ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
      <div>
        <h3 className="font-semibold text-slate-800 text-base tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="ml-4 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold flex-shrink-0"
      >✕</button>
    </div>
  )
}

function Alert({ tipo, texto }: { tipo: 'ok' | 'error'; texto: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 mb-4
      ${tipo === 'ok'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
      }`}>
      <span className="text-base">{tipo === 'ok' ? '✓' : '✕'}</span>
      {texto}
    </div>
  )
}

// =============================================================================
export default function TabsReportesPrioritarios() {
  const [reportes, setReportes]               = useState<ReportePrioritario[]>([])
  const [busqueda, setBusqueda]               = useState('')
  const [filtroEstado, setFiltroEstado]       = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [cargando, setCargando]               = useState(true)
  const [error, setError]                     = useState<string | null>(null)

  // Modal actualizar estado
  const [modalEstado, setModalEstado]         = useState<ReportePrioritario | null>(null)
  const [nuevoEstado, setNuevoEstado]         = useState<string>('')
  const [guardandoEst, setGuardandoEst]       = useState(false)
  const [msgEstado, setMsgEstado]             = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Modal resolver
  const [modalResolver, setModalResolver]     = useState<ReportePrioritario | null>(null)
  const [resolviendo, setResolviendo]         = useState(false)
  const [msgResolver, setMsgResolver]         = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Modal historial strikes
  const [modalHistorial, setModalHistorial]   = useState<ReportePrioritario | null>(null)
  const [strikes, setStrikes]                 = useState<Strike[]>([])
  const [cargandoStrikes, setCargandoStrikes] = useState(false)

  // Modal foto
  const [modalFoto, setModalFoto]             = useState<string | null>(null)

  // Reenviando
  const [reenviandoId, setReenviandoId]       = useState<number | null>(null)

  const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

  // ── Cargar ────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const params: Record<string, string> = {}
      if (busqueda.trim())   params.q         = busqueda.trim()
      if (filtroEstado)      params.estado     = filtroEstado
      if (filtroCategoria)   params.categoria  = filtroCategoria
      const { data } = await axiosClient.get('/reportes/prioritarios', { params })
      setReportes(data.reportes ?? [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudieron cargar los reportes prioritarios.')
    } finally {
      setCargando(false)
    }
  }, [busqueda, filtroEstado, filtroCategoria])

  useEffect(() => { cargar() }, [cargar])

  // ── Guardar estado ────────────────────────────────────────────────────────
  const guardarEstado = async () => {
    if (!modalEstado || !nuevoEstado) return
    setGuardandoEst(true); setMsgEstado(null)
    try {
      const { data } = await axiosClient.put(`/reportes/${modalEstado.id_reporte}/estado`, { estado: nuevoEstado })
      setMsgEstado({ tipo: 'ok', texto: data.message ?? 'Estado actualizado correctamente.' })
      setReportes(prev => prev.map(r =>
        r.id_reporte === modalEstado.id_reporte ? { ...r, estado: nuevoEstado as ReportePrioritario['estado'] } : r
      ))
      // Si se marcó como Resuelto, remover de la lista después del feedback visual
      if (nuevoEstado === 'Resuelto') {
        setTimeout(() => {
          setReportes(prev => prev.filter(r => r.id_reporte !== modalEstado.id_reporte))
          setModalEstado(null); setMsgEstado(null)
        }, 1500)
      } else {
        setTimeout(() => { setModalEstado(null); setMsgEstado(null) }, 1500)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgEstado({ tipo: 'error', texto: msg ?? 'Error al actualizar estado.' })
    } finally {
      setGuardandoEst(false)
    }
  }

  // ── Resolver ──────────────────────────────────────────────────────────────
  const resolverCaso = async () => {
    if (!modalResolver) return
    setResolviendo(true); setMsgResolver(null)
    try {
      const { data } = await axiosClient.post(`/reportes/${modalResolver.id_reporte}/resolver`)
      setMsgResolver({ tipo: 'ok', texto: data.message ?? 'Caso resuelto y archivado.' })
      setTimeout(() => {
        setReportes(prev => prev.filter(r => r.id_reporte !== modalResolver.id_reporte))
        setModalResolver(null); setMsgResolver(null)
      }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgResolver({ tipo: 'error', texto: msg ?? 'Error al resolver el caso.' })
    } finally {
      setResolviendo(false)
    }
  }

  // ── Historial de strikes ──────────────────────────────────────────────────
  const verHistorial = async (reporte: ReportePrioritario) => {
    setModalHistorial(reporte); setCargandoStrikes(true); setStrikes([])
    try {
      const { data } = await axiosClient.get(`/reportes/${reporte.id_reporte}/strikes`)
      setStrikes(data)
    } catch { setStrikes([]) }
    finally { setCargandoStrikes(false) }
  }

  // ── Marcar reenviado ──────────────────────────────────────────────────────
  const marcarReenviado = async (id: number) => {
    setReenviandoId(id)
    try {
      await axiosClient.put(`/reportes/${id}/reenviar`)
      setReportes(prev => prev.map(r =>
        r.id_reporte === id ? { ...r, reenviado_sucursal: 1 } : r
      ))
    } catch { /* silencioso */ }
    finally { setReenviandoId(null) }
  }

  const selectClass = "bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-400 transition-all"

  return (
    <div className="font-sans">

      {/* ── Banner de urgencia ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl px-5 py-4 mb-6 shadow-lg shadow-red-200/40">
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-lg tracking-tight">Reportes Prioritarios</h2>
          <p className="text-red-100 text-sm mt-0.5">
            Reportes con <strong>3+ strikes</strong> que siguen sin resolverse. Requieren tu atención directa.
          </p>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center flex-shrink-0">
          <p className="text-white text-2xl font-black tabular-nums">{reportes.length}</p>
          <p className="text-red-100 text-[10px] font-semibold uppercase tracking-wider">Pendientes</p>
        </div>
      </div>

      {/* ── Barra de filtros ─────────────────────────────────────────────────── */}
      <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0z" />
            </svg>
            <input
              type="text"
              placeholder="ID, nombre, sucursal..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar()}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-400 transition-all"
            />
          </div>

          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={selectClass}>
            <option value="">Todas las categorías</option>
            <option value="Reporte_Personal">👤 Reporte de Personal</option>
            <option value="Maquina_Dañada">⚙️ Máquina Dañada</option>
            <option value="Baño_Tapado">🚿 Baño Tapado</option>
            <option value="Problema_Limpieza">🧹 Limpieza</option>
            <option value="Otro">📌 Otro</option>
          </select>

          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={selectClass}>
            <option value="">Todos los estados</option>
            <option value="Abierto">Abierto</option>
            <option value="En_Proceso">En Proceso</option>
          </select>

          <button
            onClick={cargar}
            className="flex items-center gap-2 bg-red-600 text-white font-medium px-5 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Buscar
          </button>
        </div>
      </div>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando reportes prioritarios...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-5 py-4 text-sm">
          <span className="text-lg">⚠</span>
          <span className="flex-1">{error}</span>
          <button onClick={cargar} className="text-xs font-semibold underline underline-offset-2 hover:no-underline">Reintentar</button>
        </div>
      ) : reportes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl mb-4">✅</div>
          <p className="font-semibold text-emerald-600 text-sm">Sin reportes prioritarios</p>
          <p className="text-xs mt-1 text-slate-400">¡Excelente! No hay reportes con 3+ strikes sin resolver.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-red-200 shadow-sm">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="border-b border-red-200 bg-red-50">
                  {['ID', 'Alerta', 'Estado', 'Categoría', 'Suscriptor', 'Descripción', 'Fecha', 'Seguimiento', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-red-800 uppercase tracking-wide py-3 px-4 whitespace-nowrap first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {reportes.map(r => {
                  const strikeConf = STRIKE_CONFIG[Math.min(r.num_strikes, 3)]
                  const estadoConf = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.Abierto
                  const esPersonal = r.categoria === 'Reporte_Personal'
                  const { d, t } = formatFechaSplit(r.creado_en)

                  return (
                    <tr
                      key={r.id_reporte}
                      className="transition-colors hover:bg-red-50/60 group"
                    >
                      {/* ID */}
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          <span className="font-bold text-red-700 text-xs tabular-nums">
                            #{r.id_reporte}
                          </span>
                        </div>
                        {esPersonal && (
                          <span className="inline-flex mt-1 items-center gap-1 text-[9px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Personal
                          </span>
                        )}
                      </td>

                      {/* Alerta / Strike */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${strikeConf.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${strikeConf.dot} flex-shrink-0`} />
                          {r.num_strikes >= 3 ? `${r.num_strikes} Strikes` : strikeConf.label}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 pl-0.5">{r.horas_desde_creacion}h activo</p>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoConf.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoConf.dot} flex-shrink-0`} />
                          {estadoConf.label}
                        </span>
                        {r.estado === 'En_Proceso' && r.en_proceso_por_nombre && (
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-tight">
                            Atiende:<br/>
                            <span className="text-slate-400 font-normal">{r.en_proceso_por_nombre}</span>
                          </p>
                        )}
                        {r.estado === 'Resuelto' && r.resuelto_por_nombre && (
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-tight">
                            Resolvió:<br/>
                            <span className="text-slate-400 font-normal">{r.resuelto_por_nombre}</span>
                          </p>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4">
                        <p className={`text-[11px] font-medium ${esPersonal ? 'text-rose-600' : 'text-slate-600'}`}>
                          {CATEGORIA_ICON[r.categoria]} {CATEGORIA_LABEL[r.categoria] ?? r.categoria}
                        </p>
                        {esPersonal && r.nombre_personal_reportado && (
                          <div className="mt-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5 flex items-center gap-2">
                            {r.foto_personal_reportado ? (
                              <img
                                src={`${BACKEND}${r.foto_personal_reportado}`}
                                alt={r.nombre_personal_reportado}
                                className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-rose-300"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
                                <span className="text-rose-700 font-bold text-[10px]">
                                  {r.nombre_personal_reportado.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-rose-800 truncate">{r.nombre_personal_reportado}</p>
                              {r.puesto_personal_reportado && (
                                <p className="text-[9px] text-rose-400">{r.puesto_personal_reportado.replace(/_/g, ' ')}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Suscriptor */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 text-xs">{r.nombre_suscriptor}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{r.correo_suscriptor}</p>
                      </td>

                      {/* Descripción */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-3 break-words">
                          {r.descripcion || <span className="text-slate-300 italic">Sin descripción</span>}
                        </p>
                        {r.foto_url && (
                          <button
                            onClick={() => setModalFoto(`${BACKEND}${r.foto_url}`)}
                            className="mt-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                          >
                            📷 Ver evidencia
                          </button>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-slate-700 text-xs font-medium tabular-nums">{d}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 tabular-nums">{t}</p>
                        {r.ultimo_strike_en && (
                          <p className="text-[9px] text-red-400 mt-1 font-medium">
                            3er strike: {formatFecha(r.ultimo_strike_en)}
                          </p>
                        )}
                      </td>

                      {/* Seguimiento (reenviado) */}
                      <td className="py-3.5 px-4">
                        {r.reenviado_sucursal === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            En seguimiento
                          </span>
                        ) : (
                          <button
                            onClick={() => marcarReenviado(r.id_reporte)}
                            disabled={reenviandoId === r.id_reporte}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-40"
                          >
                            {reenviandoId === r.id_reporte ? (
                              <><div className="animate-spin w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full" /> Marcando...</>
                            ) : (
                              <>📌 Tomar seguimiento</>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 pl-4 pr-5">
                        <div className="flex flex-col gap-1.5">
                          {r.estado !== 'Resuelto' && (
                            <button
                              onClick={() => { setModalEstado(r); setNuevoEstado(r.estado); setMsgEstado(null) }}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors whitespace-nowrap"
                            >
                              Cambiar estado
                            </button>
                          )}
                          {r.estado !== 'Resuelto' && (
                            <button
                              onClick={() => { setModalResolver(r); setMsgResolver(null) }}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 transition-colors whitespace-nowrap"
                            >
                              Resolver caso
                            </button>
                          )}
                          <button
                            onClick={() => verHistorial(r)}
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors whitespace-nowrap"
                          >
                            Ver strikes
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════ MODAL: ACTUALIZAR ESTADO ══════════════════ */}
      {modalEstado && (
        <Modal onClose={() => !guardandoEst && setModalEstado(null)} maxWidth="max-w-sm">
          <ModalHeader
            title="Actualizar Estado"
            subtitle={`Reporte #${modalEstado.id_reporte} · ${modalEstado.nombre_suscriptor}`}
            onClose={() => !guardandoEst && setModalEstado(null)}
          />
          <div className="px-6 py-5">
            {modalEstado.descripcion && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed mb-4">
                {modalEstado.descripcion}
              </div>
            )}

            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Nuevo estado</label>
            <select
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value)}
              disabled={guardandoEst}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 mb-5 focus:outline-none focus:ring-2 focus:ring-red-900/10 focus:border-red-400 disabled:opacity-50 transition-all bg-white"
            >
              <option value="Abierto">Abierto</option>
              <option value="En_Proceso">En Proceso</option>
              <option value="Resuelto">Resuelto</option>
            </select>

            {msgEstado && <Alert tipo={msgEstado.tipo} texto={msgEstado.texto} />}

            <div className="flex gap-2.5">
              <button
                onClick={() => setModalEstado(null)}
                disabled={guardandoEst}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={guardarEstado}
                disabled={guardandoEst || nuevoEstado === modalEstado.estado}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {guardandoEst
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Guardando...</>
                  : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════ MODAL: RESOLVER CASO ══════════════════ */}
      {modalResolver && (
        <Modal onClose={() => !resolviendo && setModalResolver(null)} maxWidth="max-w-sm">
          <ModalHeader
            title="Resolver Caso Prioritario"
            subtitle={`Reporte #${modalResolver.id_reporte} · ${modalResolver.nombre_suscriptor}`}
            onClose={() => !resolviendo && setModalResolver(null)}
          />
          <div className="px-6 py-5">
            {modalResolver.descripcion && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed mb-4">
                {modalResolver.descripcion}
              </div>
            )}

            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 mb-5">
              <span className="text-amber-500 text-base mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Cerrar reporte prioritario</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Este reporte tiene <strong>{modalResolver.num_strikes} strikes</strong>. Se marcará como resuelto y se archivará para análisis histórico.</p>
              </div>
            </div>

            {msgResolver && <Alert tipo={msgResolver.tipo} texto={msgResolver.texto} />}

            <div className="flex gap-2.5">
              <button
                onClick={() => setModalResolver(null)}
                disabled={resolviendo}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={resolverCaso}
                disabled={resolviendo}
                className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {resolviendo
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Procesando...</>
                  : 'Confirmar resolución'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════ MODAL: HISTORIAL STRIKES ══════════════════ */}
      {modalHistorial && (
        <Modal onClose={() => setModalHistorial(null)} maxWidth="max-w-lg">
          <ModalHeader
            title="Historial de Strikes"
            subtitle={`Reporte #${modalHistorial.id_reporte} · ${modalHistorial.nombre_suscriptor} · ${formatFecha(modalHistorial.creado_en)}`}
            onClose={() => setModalHistorial(null)}
          />
          <div className="overflow-y-auto max-h-[60vh] px-6 py-5">
            {modalHistorial.descripcion && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed mb-5">
                {modalHistorial.descripcion}
              </div>
            )}
            {cargandoStrikes ? (
              <div className="flex justify-center items-center gap-2.5 py-10 text-slate-400 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                Cargando historial...
              </div>
            ) : strikes.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl mx-auto mb-3">📋</div>
                <p className="text-sm font-medium text-slate-500">Sin historial de strikes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strikes.map(s => {
                  const conf = STRIKE_CONFIG[Math.min(s.nivel, 3)]
                  let notifs: { personal?: unknown[]; sucursal?: unknown; suscriptor?: unknown } = {}
                  try { notifs = JSON.parse(s.notificados ?? '{}') } catch { /* */ }

                  return (
                    <div key={s.id_strike} className={`border rounded-xl p-4 bg-white ${s.nivel >= 3 ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${conf.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">{formatFecha(s.generado_en)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Generado a las <span className="font-semibold text-slate-700">{s.horas_al_strike}h</span> del reporte
                      </p>
                      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1.5">
                        <p className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] mb-2">Notificados</p>
                        {notifs.personal && Array.isArray(notifs.personal) && (
                          <p>👥 <span className="font-medium">{notifs.personal.length}</span> miembro(s) del personal</p>
                        )}
                        {Boolean(notifs.sucursal) && <p>🏢 Encargado de sucursal</p>}
                        {Boolean(notifs.suscriptor) && <p>📱 Suscriptor</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════ MODAL: FOTO ══════════════════ */}
      {modalFoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModalFoto(null)}
        >
          <div className="relative">
            <button
              onClick={() => setModalFoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 font-bold shadow-lg hover:bg-slate-100 z-10 text-xs"
            >✕</button>
            <img
              src={modalFoto}
              alt="Evidencia del reporte"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              onError={e => { (e.target as HTMLImageElement).src = '' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
