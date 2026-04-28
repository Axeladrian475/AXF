// ============================================================================
//  pages/reportes/tabs/TabsBuscarReportes.tsx  — VERSIÓN FUNCIONAL
//  Lista reportes reales desde la BD con acciones funcionales.
//  Endpoints:
//    GET  /api/reportes              → listar
//    PUT  /api/reportes/:id/estado   → actualizar estado
//    POST /api/reportes/:id/resolver → resolver caso
//    GET  /api/reportes/:id/strikes  → historial de strikes
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Reporte {
  id_reporte:          number
  categoria:           string
  descripcion:         string
  foto_url:            string | null
  estado:              'Abierto' | 'En_Proceso' | 'Resuelto'
  num_strikes:         number
  creado_en:           string
  nombre_suscriptor:   string
  correo_suscriptor:   string
  nombre_sucursal:     string
  horas_desde_creacion: number
}

interface Strike {
  id_strike:   number
  nivel:       number
  notificados: string
  generado_en: string
  horas_al_strike: number
}

// ─── Estilos de strike ────────────────────────────────────────────────────────
const STRIKE_STYLE: Record<number, { clase: string; etiqueta: string }> = {
  0: { clase: 'bg-gray-200 text-gray-600',   etiqueta: 'Sin Strike' },
  1: { clase: 'bg-yellow-400 text-black',    etiqueta: '1er STRIKE' },
  2: { clase: 'bg-orange-500 text-white',    etiqueta: '2do STRIKE' },
  3: { clase: 'bg-red-600 text-white',       etiqueta: '3er STRIKE' },
}

const ESTADO_STYLE: Record<string, string> = {
  Abierto:    'bg-red-100 text-red-700 border border-red-200',
  En_Proceso: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Resuelto:   'bg-green-100 text-green-700 border border-green-200',
}

const ESTADO_LABEL: Record<string, string> = {
  Abierto:    'Abierto',
  En_Proceso: 'En Proceso',
  Resuelto:   'Resuelto',
}

const CATEGORIA_LABEL: Record<string, string> = {
  Maquina_Dañada:    'Máquina Dañada',
  Baño_Tapado:       'Baño Tapado',
  Problema_Limpieza: 'Problema de Limpieza',
  Reporte_Personal:  'Reporte de Personal',
  Otro:              'Otro',
}

// ─── Helper: formatear fecha ──────────────────────────────────────────────────
function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// =============================================================================
export default function TabsBuscarReportes() {
  const [reportes, setReportes]           = useState<Reporte[]>([])
  const [busqueda, setBusqueda]           = useState('')
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroStrike, setFiltroStrike]   = useState('')
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  // ── Modales ───────────────────────────────────────────────────────────────
  const [modalEstado, setModalEstado]     = useState<Reporte | null>(null)
  const [nuevoEstado, setNuevoEstado]     = useState<string>('')
  const [guardandoEst, setGuardandoEst]  = useState(false)
  const [msgEstado, setMsgEstado]         = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [modalResolver, setModalResolver] = useState<Reporte | null>(null)
  const [resolviendo, setResolviendo]     = useState(false)
  const [msgResolver, setMsgResolver]     = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [modalHistorial, setModalHistorial] = useState<Reporte | null>(null)
  const [strikes, setStrikes]               = useState<Strike[]>([])
  const [cargandoStrikes, setCargandoStrikes] = useState(false)

  const [modalFoto, setModalFoto]         = useState<string | null>(null)

  // ── Cargar reportes ───────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (busqueda.trim()) params.q = busqueda.trim()
      if (filtroEstado)    params.estado = filtroEstado
      if (filtroStrike)    params.strike = filtroStrike
      const { data } = await axiosClient.get('/reportes', { params })
      setReportes(data.reportes ?? [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudieron cargar los reportes.')
    } finally {
      setCargando(false)
    }
  }, [busqueda, filtroEstado, filtroStrike])

  useEffect(() => { cargar() }, [cargar])

  // ── Actualizar estado ─────────────────────────────────────────────────────
  const guardarEstado = async () => {
    if (!modalEstado || !nuevoEstado) return
    setGuardandoEst(true)
    setMsgEstado(null)
    try {
      const { data } = await axiosClient.put(`/reportes/${modalEstado.id_reporte}/estado`, { estado: nuevoEstado })
      setMsgEstado({ tipo: 'ok', texto: data.message ?? 'Estado actualizado.' })
      // Actualizar localmente sin recargar todo
      setReportes(prev => prev.map(r =>
        r.id_reporte === modalEstado.id_reporte
          ? { ...r, estado: nuevoEstado as Reporte['estado'] }
          : r
      ))
      setTimeout(() => { setModalEstado(null); setMsgEstado(null) }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgEstado({ tipo: 'error', texto: msg ?? 'Error al actualizar estado.' })
    } finally {
      setGuardandoEst(false)
    }
  }

  // ── Resolver caso ─────────────────────────────────────────────────────────
  const resolverCaso = async () => {
    if (!modalResolver) return
    setResolviendo(true)
    setMsgResolver(null)
    try {
      const { data } = await axiosClient.post(`/reportes/${modalResolver.id_reporte}/resolver`)
      setMsgResolver({ tipo: 'ok', texto: data.message ?? 'Caso resuelto y eliminado.' })
      // Eliminar la fila de la tabla — el reporte ya no existe en la BD
      setReportes(prev => prev.filter(r => r.id_reporte !== modalResolver.id_reporte))
      setTimeout(() => { setModalResolver(null); setMsgResolver(null) }, 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsgResolver({ tipo: 'error', texto: msg ?? 'Error al resolver el caso.' })
    } finally {
      setResolviendo(false)
    }
  }

  // ── Ver historial de strikes ───────────────────────────────────────────────
  const verHistorial = async (reporte: Reporte) => {
    setModalHistorial(reporte)
    setCargandoStrikes(true)
    setStrikes([])
    try {
      const { data } = await axiosClient.get(`/reportes/${reporte.id_reporte}/strikes`)
      setStrikes(data)
    } catch {
      setStrikes([])
    } finally {
      setCargandoStrikes(false)
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Buscar y Administrar Reportes</h2>
      <hr className="border-gray-300 mb-4" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por ID, nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
          className="flex-1 min-w-[200px] max-w-sm bg-white border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-orange-400"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-orange-400"
        >
          <option value="">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="En_Proceso">En Proceso</option>
          <option value="Resuelto">Resuelto</option>
        </select>
        <select
          value={filtroStrike}
          onChange={e => setFiltroStrike(e.target.value)}
          className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-orange-400"
        >
          <option value="">Todos los strikes</option>
          <option value="0">Sin strike</option>
          <option value="1">1er Strike</option>
          <option value="2">2do Strike</option>
          <option value="3">3er Strike</option>
        </select>
        <button
          onClick={cargar}
          className="bg-gray-600 text-white font-bold px-5 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Estado de carga / error */}
      {cargando ? (
        <div className="flex items-center gap-2 py-8 text-gray-500 text-sm">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
          Cargando reportes...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <span>❌</span> {error}
          <button onClick={cargar} className="ml-auto text-xs underline font-bold">Reintentar</button>
        </div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          <p className="text-2xl mb-2">📋</p>
          <p>No se encontraron reportes con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Nivel Alerta</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Estado</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Sucursal / Categoría</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Suscriptor</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Descripción</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Fecha</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Evidencia</th>
                <th className="text-left font-bold text-black pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map(r => {
                const strike = STRIKE_STYLE[r.num_strikes] ?? STRIKE_STYLE[0]
                return (
                  <tr key={r.id_reporte} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* ID */}
                    <td className="py-3 pr-4 text-black font-bold">#{r.id_reporte}</td>

                    {/* Nivel alerta */}
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded text-xs font-black ${strike.clase}`}>
                        {strike.etiqueta}
                      </span>
                      {r.num_strikes > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {r.horas_desde_creacion}h transcurridas
                        </p>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_STYLE[r.estado]}`}>
                        {ESTADO_LABEL[r.estado]}
                      </span>
                    </td>

                    {/* Sucursal / Categoría */}
                    <td className="py-3 pr-4">
                      <p className="font-bold text-black text-sm">{r.nombre_sucursal}</p>
                      <p className="text-gray-500 text-xs">{CATEGORIA_LABEL[r.categoria] ?? r.categoria}</p>
                    </td>

                    {/* Suscriptor */}
                    <td className="py-3 pr-4">
                      <p className="text-black font-medium">{r.nombre_suscriptor}</p>
                      <p className="text-gray-400 text-xs">{r.correo_suscriptor}</p>
                    </td>

                    {/* Descripción */}
                    <td className="py-3 pr-4 max-w-[200px]">
                      <p className="text-gray-700 text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap break-words">
                        {r.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                      </p>
                    </td>

                    {/* Fecha de creación */}
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <p className="text-black text-xs font-medium">
                        {new Date(r.creado_en).toLocaleDateString('es-MX', {
                          timeZone: 'America/Mexico_City',
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {new Date(r.creado_en).toLocaleTimeString('es-MX', {
                          timeZone: 'America/Mexico_City',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </td>

                    {/* Evidencia */}
                    <td className="py-3 pr-4">
                      {r.foto_url ? (
                        <button
                          onClick={() => setModalFoto(`${import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'}${r.foto_url}`)}
                          className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                        >
                          🖼 Ver Foto
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin imagen</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.estado !== 'Resuelto' && (
                          <button
                            onClick={() => { setModalEstado(r); setNuevoEstado(r.estado); setMsgEstado(null) }}
                            className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            Actualizar Estado
                          </button>
                        )}
                        {r.estado !== 'Resuelto' && (
                          <button
                            onClick={() => { setModalResolver(r); setMsgResolver(null) }}
                            className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded hover:bg-green-700 transition-colors"
                          >
                            Resolver Caso
                          </button>
                        )}
                        <button
                          onClick={() => verHistorial(r)}
                          className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                        >
                          Historial Strike
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════ MODAL: ACTUALIZAR ESTADO ═══════════ */}
      {modalEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !guardandoEst) setModalEstado(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Actualizar Estado</h3>
            <p className="text-xs text-gray-500 mb-3">
              Reporte #{modalEstado.id_reporte} — {modalEstado.nombre_suscriptor}
            </p>
            {modalEstado.descripcion && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 mb-4 leading-relaxed">
                📝 {modalEstado.descripcion}
              </div>
            )}

            <label className="block text-sm font-bold text-gray-700 mb-2">Nuevo estado</label>
            <select
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value)}
              disabled={guardandoEst}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-orange-400 disabled:opacity-50"
            >
              <option value="Abierto">Abierto</option>
              <option value="En_Proceso">En Proceso</option>
              <option value="Resuelto">Resuelto</option>
            </select>

            {msgEstado && (
              <div className={`rounded-lg px-3 py-2 text-sm mb-4 flex items-center gap-2
                ${msgEstado.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {msgEstado.tipo === 'ok' ? '✅' : '❌'} {msgEstado.texto}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setModalEstado(null)}
                disabled={guardandoEst}
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEstado}
                disabled={guardandoEst || nuevoEstado === modalEstado.estado}
                className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {guardandoEst
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Guardando...</>
                  : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: RESOLVER CASO ═══════════ */}
      {modalResolver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !resolviendo) setModalResolver(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Resolver Caso</h3>
            <p className="text-xs text-gray-500 mb-3">
              Reporte #{modalResolver.id_reporte} — {modalResolver.nombre_suscriptor}
            </p>
            {modalResolver.descripcion && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 mb-4 leading-relaxed">
                📝 {modalResolver.descripcion}
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 mb-4">
              ⚠️ Esta acción <strong>eliminará el reporte permanentemente</strong> de la base de datos. No podrá deshacerse.
            </div>

            {msgResolver && (
              <div className={`rounded-lg px-3 py-2 text-sm mb-4 flex items-center gap-2
                ${msgResolver.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {msgResolver.tipo === 'ok' ? '✅' : '❌'} {msgResolver.texto}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setModalResolver(null)}
                disabled={resolviendo}
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={resolverCaso}
                disabled={resolviendo}
                className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {resolviendo
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Resolviendo...</>
                  : 'Confirmar Resolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: HISTORIAL DE STRIKES ═══════════ */}
      {modalHistorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalHistorial(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Historial de Strikes</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reporte #{modalHistorial.id_reporte} — {modalHistorial.nombre_suscriptor}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(modalHistorial.creado_en).toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setModalHistorial(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors"
              >✕</button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalHistorial.descripcion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 mb-4 leading-relaxed">
                  📝 {modalHistorial.descripcion}
                </div>
              )}
              {cargandoStrikes ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                  Cargando historial...
                </div>
              ) : strikes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p className="text-2xl mb-2">✅</p>
                  <p>Este reporte no tiene strikes registrados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {strikes.map(s => {
                    const style = STRIKE_STYLE[s.nivel] ?? STRIKE_STYLE[0]
                    let notifs: { personal?: unknown[]; sucursal?: unknown; suscriptor?: unknown } = {}
                    try { notifs = JSON.parse(s.notificados ?? '{}') } catch { /* */ }

                    return (
                      <div key={s.id_strike} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-black ${style.clase}`}>
                            {style.etiqueta}
                          </span>
                          <span className="text-xs text-gray-400">{formatFecha(s.generado_en)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Generado a las <strong>{s.horas_al_strike}h</strong> desde la creación del reporte
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          <p className="font-semibold text-gray-600 mb-1">Notificados:</p>
                          {notifs.personal && Array.isArray(notifs.personal) && (
                            <p>👥 <strong>{notifs.personal.length}</strong> miembro(s) del personal</p>
                          )}
                          {Boolean(notifs.sucursal) && (
                            <p>🏢 Sucursal notificada</p>
                          )}
                          {Boolean(notifs.suscriptor) && (
                            <p>📱 Suscriptor notificado</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: VER FOTO ═══════════ */}
      {modalFoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalFoto(null)}>
          <div className="relative max-w-2xl max-h-[90vh]">
            <button
              onClick={() => setModalFoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 font-bold shadow-lg hover:bg-gray-100 z-10"
            >✕</button>
            <img
              src={modalFoto}
              alt="Evidencia del reporte"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              onError={e => { (e.target as HTMLImageElement).src = '' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}