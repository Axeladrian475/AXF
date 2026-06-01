// ============================================================================
//  pages/reportes/tabs/TabsBuscarReportes.tsx  — DISEÑO PROFESIONAL
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Reporte {
  id_reporte:                  number
  categoria:                   string
  descripcion:                 string
  foto_url:                    string | null
  es_privado:                  number
  estado:                      'Abierto' | 'En_Proceso' | 'Resuelto'
  num_strikes:                 number
  creado_en:                   string
  nombre_suscriptor:           string
  correo_suscriptor:           string
  nombre_sucursal:             string
  horas_desde_creacion:        number
  nombre_personal_reportado:   string | null
  puesto_personal_reportado:   string | null
  foto_personal_reportado:     string | null
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

interface Sumado {
  nombre:    string
  sumado_en: string
}

// ─── Config visual ────────────────────────────────────────────────────────────

const STRIKE_CONFIG: Record<number, { dot: string; badge: string; label: string }> = {
  0: { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',   label: 'Sin alerta' },
  1: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',    label: '1er Strike' },
  2: { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', label: '2do Strike' },
  3: { dot: 'bg-red-600',     badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',          label: '3er Strike' },
}

const ESTADO_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  Abierto:    { dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',     label: 'Abierto' },
  En_Proceso: { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',  label: 'En Proceso' },
  Resuelto:   { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'Resuelto' },
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

// ─── Componente Modal base ────────────────────────────────────────────────────

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
export default function TabsBuscarReportes() {
  const [reportes, setReportes]               = useState<Reporte[]>([])
  const [busqueda, setBusqueda]               = useState('')
  const [filtroEstado, setFiltroEstado]       = useState('')
  const [filtroStrike, setFiltroStrike]       = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [cargando, setCargando]               = useState(true)
  const [error, setError]                     = useState<string | null>(null)

  const [modalEstado, setModalEstado]         = useState<Reporte | null>(null)
  const [nuevoEstado, setNuevoEstado]         = useState<string>('')
  const [guardandoEst, setGuardandoEst]       = useState(false)
  const [msgEstado, setMsgEstado]             = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [modalResolver, setModalResolver]     = useState<Reporte | null>(null)
  const [resolviendo, setResolviendo]         = useState(false)
  const [msgResolver, setMsgResolver]         = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [modalHistorial, setModalHistorial]   = useState<Reporte | null>(null)
  const [strikes, setStrikes]                 = useState<Strike[]>([])
  const [cargandoStrikes, setCargandoStrikes] = useState(false)

  const [modalFoto, setModalFoto]             = useState<string | null>(null)
  const [modalSumados, setModalSumados]       = useState<Reporte | null>(null)
  const [sumados, setSumados]                 = useState<Sumado[]>([])
  const [cargandoSumados, setCargandoSumados] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const params: Record<string, string> = {}
      if (busqueda.trim())  params.q        = busqueda.trim()
      if (filtroEstado)     params.estado    = filtroEstado
      if (filtroStrike)     params.strike    = filtroStrike
      if (filtroCategoria)  params.categoria = filtroCategoria
      const { data } = await axiosClient.get('/reportes', { params })
      setReportes(data.reportes ?? [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudieron cargar los reportes.')
    } finally {
      setCargando(false)
    }
  }, [busqueda, filtroEstado, filtroStrike, filtroCategoria])

  useEffect(() => { cargar() }, [cargar])

  const guardarEstado = async () => {
    if (!modalEstado || !nuevoEstado) return
    setGuardandoEst(true); setMsgEstado(null)
    try {
      const { data } = await axiosClient.put(`/reportes/${modalEstado.id_reporte}/estado`, { estado: nuevoEstado })
      setMsgEstado({ tipo: 'ok', texto: data.message ?? 'Estado actualizado correctamente.' })
      setReportes(prev => prev.map(r =>
        r.id_reporte === modalEstado.id_reporte ? { ...r, estado: nuevoEstado as Reporte['estado'] } : r
      ))
      setTimeout(() => { setModalEstado(null); setMsgEstado(null) }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgEstado({ tipo: 'error', texto: msg ?? 'Error al actualizar estado.' })
    } finally {
      setGuardandoEst(false)
    }
  }

  const resolverCaso = async () => {
    if (!modalResolver) return
    setResolviendo(true); setMsgResolver(null)
    try {
      const { data } = await axiosClient.post(`/reportes/${modalResolver.id_reporte}/resolver`)
      setMsgResolver({ tipo: 'ok', texto: data.message ?? 'Caso resuelto y archivado.' })
      setReportes(prev => prev.map(r => r.id_reporte === modalResolver.id_reporte ? { ...r, estado: 'Resuelto' as const } : r))
      setTimeout(() => { setModalResolver(null); setMsgResolver(null) }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgResolver({ tipo: 'error', texto: msg ?? 'Error al resolver el caso.' })
    } finally {
      setResolviendo(false)
    }
  }

  const verHistorial = async (reporte: Reporte) => {
    setModalHistorial(reporte); setCargandoStrikes(true); setStrikes([])
    try {
      const { data } = await axiosClient.get(`/reportes/${reporte.id_reporte}/strikes`)
      setStrikes(data)
    } catch { setStrikes([]) }
    finally { setCargandoStrikes(false) }
  }

  const verSumados = async (reporte: Reporte) => {
    setModalSumados(reporte); setCargandoSumados(true); setSumados([])
    try {
      const { data } = await axiosClient.get(`/reportes/${reporte.id_reporte}`)
      setSumados(data.sumados ?? [])
    } catch { setSumados([]) }
    finally { setCargandoSumados(false) }
  }

  const selectClass = "bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"

  return (
    <div className="font-sans">

      {/* ── Encabezado de sección ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Administración de Reportes</h2>
          <p className="text-sm text-slate-400 mt-0.5">Consulta, filtra y gestiona todos los reportes del sistema</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* ── Barra de filtros ─────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
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
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
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
            <option value="Resuelto">Resuelto</option>
          </select>

          <select value={filtroStrike} onChange={e => setFiltroStrike(e.target.value)} className={selectClass}>
            <option value="">Todos los strikes</option>
            <option value="0">Sin alerta</option>
            <option value="1">1er Strike</option>
            <option value="2">2do Strike</option>
            <option value="3">3er Strike</option>
          </select>

          <button
            onClick={cargar}
            className="bg-slate-900 text-white font-medium px-5 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando reportes...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-5 py-4 text-sm">
          <span className="text-lg">⚠</span>
          <span className="flex-1">{error}</span>
          <button onClick={cargar} className="text-xs font-semibold underline underline-offset-2 hover:no-underline">Reintentar</button>
        </div>
      ) : reportes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4">📋</div>
          <p className="font-medium text-slate-500 text-sm">Sin resultados</p>
          <p className="text-xs mt-1">No se encontraron reportes con los filtros aplicados.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3 font-medium">{reportes.length} reporte{reportes.length !== 1 ? 's' : ''} encontrado{reportes.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['ID', 'Alerta', 'Estado', 'Sucursal / Categoría', 'Suscriptor', 'Descripción', 'Fecha', 'Evidencia', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4 whitespace-nowrap first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportes.map(r => {
                  const strikeConf = STRIKE_CONFIG[Math.min(r.num_strikes, 3)] ?? STRIKE_CONFIG[0]
                  const labelStrike = r.num_strikes >= 3 ? `${r.num_strikes}er Strike` : strikeConf.label
                  const estadoConf = ESTADO_CONFIG[r.estado] ?? ESTADO_CONFIG.Abierto
                  const esPersonal = r.categoria === 'Reporte_Personal'
                  const { d, t } = formatFechaSplit(r.creado_en)

                  return (
                    <tr
                      key={r.id_reporte}
                      className={`transition-colors group ${esPersonal ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* ID */}
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex items-center gap-1.5">
                          {esPersonal && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />}
                          <span className={`font-semibold text-xs tabular-nums ${esPersonal ? 'text-rose-700' : 'text-slate-800'}`}>
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
                          {labelStrike}
                        </span>
                        {r.num_strikes > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1 pl-0.5">{r.horas_desde_creacion}h activo</p>
                        )}
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

                      {/* Sucursal / Categoría */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 text-xs">{r.nombre_sucursal}</p>
                        <p className={`text-[11px] mt-0.5 ${esPersonal ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                          {CATEGORIA_ICON[r.categoria]} {CATEGORIA_LABEL[r.categoria] ?? r.categoria}
                        </p>
                      </td>

                      {/* Suscriptor */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 text-xs">{r.nombre_suscriptor}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{r.correo_suscriptor}</p>
                        {esPersonal && r.nombre_personal_reportado && (
                          <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-2 flex items-center gap-2.5">
                            {/* Avatar del personal reportado */}
                            {r.foto_personal_reportado ? (
                              <img
                                src={`${(import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace('/api', '')}${r.foto_personal_reportado}`}
                                alt={r.nombre_personal_reportado}
                                className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-rose-300"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
                                <span className="text-rose-700 font-bold text-sm">
                                  {r.nombre_personal_reportado.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Reportado</p>
                              <p className="text-[11px] font-semibold text-rose-800 truncate">{r.nombre_personal_reportado}</p>
                              {r.puesto_personal_reportado && (
                                <p className="text-[10px] text-rose-400">{r.puesto_personal_reportado.replace(/_/g, ' ')}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Descripción */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-3 break-words">
                          {r.descripcion || <span className="text-slate-300 italic">Sin descripción</span>}
                        </p>
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-slate-700 text-xs font-medium tabular-nums">{d}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 tabular-nums">{t}</p>
                      </td>

                      {/* Evidencia */}
                      <td className="py-3.5 px-4">
                        {r.foto_url ? (
                          <button
                            onClick={() => setModalFoto(`${import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${r.foto_url}`)}
                            className="block w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm hover:shadow-md flex-shrink-0"
                            title="Ver evidencia"
                          >
                            <img
                              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${r.foto_url}`}
                              alt="Evidencia"
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px] italic">Sin imagen</span>
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
                          {!esPersonal && (
                            <button
                              onClick={() => verSumados(r)}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 transition-colors whitespace-nowrap"
                            >
                              Sumados
                            </button>
                          )}
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
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 mb-5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-50 transition-all bg-white"
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
                className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
            title="Resolver Caso"
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
                <p className="text-sm font-semibold text-amber-800">Cerrar reporte</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Este reporte se marcará como resuelto y se conservará para análisis histórico.</p>
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
                <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                Cargando historial...
              </div>
            ) : strikes.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl mx-auto mb-3">✓</div>
                <p className="text-sm font-medium text-slate-500">Sin strikes</p>
                <p className="text-xs mt-0.5">Este reporte no ha generado alertas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strikes.map(s => {
                  const conf = STRIKE_CONFIG[s.nivel] ?? STRIKE_CONFIG[0]
                  let notifs: { personal?: unknown[]; sucursal?: unknown; suscriptor?: unknown } = {}
                  try { notifs = JSON.parse(s.notificados ?? '{}') } catch { /* */ }

                  return (
                    <div key={s.id_strike} className="border border-slate-200 rounded-xl p-4 bg-white">
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

      {/* ══════════════════ MODAL: SUMADOS ══════════════════ */}
      {modalSumados && (
        <Modal onClose={() => setModalSumados(null)} maxWidth="max-w-md">
          <ModalHeader
            title="Suscriptores Sumados"
            subtitle={`Reporte #${modalSumados.id_reporte} · ${modalSumados.nombre_sucursal}`}
            onClose={() => setModalSumados(null)}
          />
          <div className="overflow-y-auto max-h-[60vh] px-6 py-5">
            {modalSumados.descripcion && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 leading-relaxed mb-5">
                {modalSumados.descripcion}
              </div>
            )}
            {cargandoSumados ? (
              <div className="flex justify-center items-center gap-2.5 py-10 text-slate-400 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full" />
                Cargando...
              </div>
            ) : sumados.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-xl mx-auto mb-3">👥</div>
                <p className="text-sm font-medium text-slate-500">Sin sumados</p>
                <p className="text-xs mt-0.5">Ningún suscriptor se ha unido a este reporte.</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  {sumados.length} {sumados.length === 1 ? 'persona' : 'personas'} sumada{sumados.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {sumados.map((s, i) => {
                    const { d, t } = formatFechaSplit(s.sumado_en)
                    return (
                      <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                            {s.nombre.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-slate-800">{s.nombre}</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-[10px] text-slate-500 tabular-nums">{d}</p>
                          <p className="text-[10px] text-slate-400 tabular-nums">{t}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
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