// ============================================================================
//  pages/reportes/tabs/TabsReportesPersonal.tsx
//  Vista exclusiva para el usuario SUCURSAL — reportes de su personal.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

interface ReportePersonal {
  id_reporte:                number
  descripcion:               string
  foto_url:                  string | null
  estado:                    'Abierto' | 'En_Proceso' | 'Resuelto'
  num_strikes:               number
  creado_en:                 string
  nombre_suscriptor:         string
  correo_suscriptor:         string
  nombre_personal_reportado: string | null
  puesto_personal_reportado: string | null
  sobre_atencion_previa:     number | null
  horas_desde_creacion:      number
}

const ESTADO_STYLE: Record<string, string> = {
  Abierto:    'bg-red-100 text-red-700 border border-red-300',
  En_Proceso: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  Resuelto:   'bg-green-100 text-green-700 border border-green-300',
}
const ESTADO_LABEL: Record<string, string> = {
  Abierto: 'Abierto', En_Proceso: 'En Proceso', Resuelto: 'Resuelto',
}

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

export default function TabsReportesPersonal() {
  const [reportes, setReportes] = useState<ReportePersonal[]>([])
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // ── Modal actualizar estado ───────────────────────────────────────────────
  const [modalEstado,   setModalEstado]   = useState<ReportePersonal | null>(null)
  const [nuevoEstado,   setNuevoEstado]   = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [msgEstado,     setMsgEstado]     = useState<{ tipo: 'ok'|'error'; texto: string }|null>(null)

  // ── Modal resolver ────────────────────────────────────────────────────────
  const [modalResolver, setModalResolver] = useState<ReportePersonal | null>(null)
  const [resolviendo,   setResolviendo]   = useState(false)
  const [msgResolver,   setMsgResolver]   = useState<{ tipo: 'ok'|'error'; texto: string }|null>(null)

  // ── Modal foto ────────────────────────────────────────────────────────────
  const [modalFoto, setModalFoto] = useState<string | null>(null)

  // ── Cargar ────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const params: Record<string, string> = { categoria: 'Reporte_Personal' }
      if (busqueda.trim()) params.q      = busqueda.trim()
      if (filtroEstado)    params.estado = filtroEstado
      const { data } = await axiosClient.get('/reportes', { params })
      setReportes(data.reportes ?? [])
    } catch {
      setError('No se pudieron cargar los reportes de personal.')
    } finally {
      setCargando(false)
    }
  }, [busqueda, filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  // ── Guardar estado ────────────────────────────────────────────────────────
  const guardarEstado = async () => {
    if (!modalEstado || !nuevoEstado) return
    setGuardando(true); setMsgEstado(null)
    try {
      await axiosClient.put(`/reportes/${modalEstado.id_reporte}/estado`, { estado: nuevoEstado })
      setReportes(prev => prev.map(r =>
        r.id_reporte === modalEstado.id_reporte ? { ...r, estado: nuevoEstado as ReportePersonal['estado'] } : r
      ))
      setMsgEstado({ tipo: 'ok', texto: 'Estado actualizado correctamente.' })
      setTimeout(() => { setModalEstado(null); setMsgEstado(null) }, 1200)
    } catch {
      setMsgEstado({ tipo: 'error', texto: 'Error al actualizar el estado.' })
    } finally {
      setGuardando(false)
    }
  }

  // ── Resolver ──────────────────────────────────────────────────────────────
  const resolverCaso = async () => {
    if (!modalResolver) return
    setResolviendo(true); setMsgResolver(null)
    try {
      await axiosClient.post(`/reportes/${modalResolver.id_reporte}/resolver`)
      setReportes(prev => prev.map(r => r.id_reporte === modalResolver.id_reporte ? { ...r, estado: 'Resuelto' as const } : r))
      setMsgResolver({ tipo: 'ok', texto: 'Reporte resuelto y archivado.' })
      setTimeout(() => { setModalResolver(null); setMsgResolver(null) }, 1200)
    } catch {
      setMsgResolver({ tipo: 'error', texto: 'Error al resolver el reporte.' })
    } finally {
      setResolviendo(false)
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">🚨</span>
        <h2 className="text-xl font-bold text-black">Reportes de Personal</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Reportes enviados por suscriptores sobre el personal de tu sucursal. Solo tú puedes verlos.
      </p>
      <hr className="border-gray-300 mb-5" />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por ID o nombre del suscriptor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
          className="flex-1 min-w-[220px] max-w-sm bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-red-400"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-red-400"
        >
          <option value="">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="En_Proceso">En Proceso</option>
          <option value="Resuelto">Resuelto</option>
        </select>
        <button
          onClick={cargar}
          className="bg-red-700 text-white font-bold px-5 py-2 rounded-lg text-sm hover:bg-red-800 transition-colors"
        >
          Buscar
        </button>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="flex items-center gap-2 py-10 text-gray-500 text-sm">
          <div className="animate-spin w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full" />
          Cargando reportes de personal...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          ❌ {error}
          <button onClick={cargar} className="ml-auto text-xs underline font-bold">Reintentar</button>
        </div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-gray-500">Sin reportes de personal</p>
          <p className="text-sm mt-1">No hay reportes activos sobre tu personal en este momento.</p>
        </div>
      ) : (
        <>
          {/* Contador */}
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">
              {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
            </span>
            <span className="text-xs text-gray-400">— solo visibles para ti como encargado de sucursal</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-red-100">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">ID</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Personal Reportado</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Reportado Por</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Descripción</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Fecha</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Evidencia</th>
                  <th className="text-left font-bold px-4 py-3 text-xs uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r, idx) => (
                  <tr
                    key={r.id_reporte}
                    className={`border-b border-red-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50/40'} hover:bg-red-50`}
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <p className="font-black text-red-700 text-sm">#{r.id_reporte}</p>
                      {r.sobre_atencion_previa === 1 && (
                        <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold uppercase">
                          Atención previa
                        </span>
                      )}
                    </td>

                    {/* Personal reportado */}
                    <td className="px-4 py-3">
                      {r.nombre_personal_reportado ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-black text-sm flex-shrink-0">
                              {r.nombre_personal_reportado.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-black text-sm leading-tight">{r.nombre_personal_reportado}</p>
                              {r.puesto_personal_reportado && (
                                <p className="text-xs text-gray-500">{r.puesto_personal_reportado}</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No especificado</span>
                      )}
                    </td>

                    {/* Suscriptor que reportó */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-black text-sm">{r.nombre_suscriptor}</p>
                      <p className="text-xs text-gray-400">{r.correo_suscriptor}</p>
                    </td>

                    {/* Descripción */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-gray-700 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">
                        {r.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                      </p>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_STYLE[r.estado]}`}>
                        {ESTADO_LABEL[r.estado]}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{r.horas_desde_creacion}h desde creación</p>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3">
                      {r.foto_url ? (
                        <button
                          onClick={() => setModalFoto(`${BACKEND}${r.foto_url}`)}
                          className="group relative block w-16 h-16 rounded-lg overflow-hidden border-2 border-red-300 hover:border-red-500 transition-colors"
                          title="Ver foto"
                        >
                          <img
                            src={`${BACKEND}${r.foto_url}`}
                            alt="Evidencia"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">🔍</span>
                          </div>
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs italic">Sin imagen</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {r.estado !== 'Resuelto' && (
                          <button
                            onClick={() => { setModalEstado(r); setNuevoEstado(r.estado); setMsgEstado(null) }}
                            className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            Actualizar Estado
                          </button>
                        )}
                        {r.estado !== 'Resuelto' && (
                          <button
                            onClick={() => { setModalResolver(r); setMsgResolver(null) }}
                            className="bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors whitespace-nowrap"
                          >
                            ✓ Resolver Caso
                          </button>
                        )}
                        {r.estado === 'Resuelto' && (
                          <span className="text-xs text-green-600 font-bold">✓ Resuelto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ MODAL: ACTUALIZAR ESTADO ═══ */}
      {modalEstado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !guardando) setModalEstado(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Actualizar Estado</h3>
            <p className="text-xs text-gray-500 mb-1">Reporte #{modalEstado.id_reporte}</p>
            {modalEstado.nombre_personal_reportado && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">
                👤 Personal: <strong>{modalEstado.nombre_personal_reportado}</strong>
              </div>
            )}
            {modalEstado.descripcion && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 mb-4 leading-relaxed">
                📝 {modalEstado.descripcion}
              </div>
            )}
            <label className="block text-sm font-bold text-gray-700 mb-2">Nuevo estado</label>
            <select
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value)}
              disabled={guardando}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-400 disabled:opacity-50"
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
              <button onClick={() => setModalEstado(null)} disabled={guardando}
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEstado} disabled={guardando || nuevoEstado === modalEstado.estado}
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {guardando ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: RESOLVER ═══ */}
      {modalResolver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !resolviendo) setModalResolver(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 text-base mb-1">Resolver Caso</h3>
            <p className="text-xs text-gray-500 mb-1">Reporte #{modalResolver.id_reporte}</p>
            {modalResolver.nombre_personal_reportado && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">
                👤 Personal: <strong>{modalResolver.nombre_personal_reportado}</strong>
                {modalResolver.puesto_personal_reportado && ` — ${modalResolver.puesto_personal_reportado}`}
              </div>
            )}
            {modalResolver.descripcion && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 mb-4 leading-relaxed">
                📝 {modalResolver.descripcion}
              </div>
            )}
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700 mb-4">
              ⚠️ Este reporte se <strong>marcará como resuelto</strong> y se archivará para análisis histórico.
            </div>
            {msgResolver && (
              <div className={`rounded-lg px-3 py-2 text-sm mb-4 flex items-center gap-2
                ${msgResolver.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {msgResolver.tipo === 'ok' ? '✅' : '❌'} {msgResolver.texto}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setModalResolver(null)} disabled={resolviendo}
                className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Cancelar
              </button>
              <button onClick={resolverCaso} disabled={resolviendo}
                className="flex-1 bg-green-700 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {resolviendo ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Resolviendo...</> : '✓ Confirmar Resolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: FOTO ═══ */}
      {modalFoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setModalFoto(null)}>
          <div className="relative max-w-2xl max-h-[90vh]">
            <button onClick={() => setModalFoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 font-bold shadow-lg hover:bg-gray-100 z-10">
              ✕
            </button>
            <img src={modalFoto} alt="Evidencia" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
