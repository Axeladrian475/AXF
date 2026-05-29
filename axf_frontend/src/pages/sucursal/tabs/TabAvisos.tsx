import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, UserCheck, Send, Search, CheckSquare, Square } from 'lucide-react'
import axiosClient from '../../../api/axiosClient'
import { getPersonal, type Personal } from '../../../api/personalApi'
import { imageUrl } from '../../../utils/imageUrl'

const GRUPOS = [
  { key: 'todos',        label: 'Todo el personal', desc: 'Todos los empleados activos' },
  { key: 'staff',        label: 'Staff',            desc: 'Personal administrativo' },
  { key: 'entrenadores', label: 'Entrenadores',     desc: 'Entrenadores y mixtos' },
  { key: 'nutriologos',  label: 'Nutriólogos',      desc: 'Nutriólogos y mixtos' },
] as const

type GrupoKey = typeof GRUPOS[number]['key']
type ModoDestino = 'grupos' | 'manual'

interface AvisoEnviado {
  id_aviso:            number
  mensaje:             string
  creado_en:           string
  total_destinatarios: number
  total_leidos:        number
  total_pendientes:    number
}

interface Destinatario {
  id_personal: number
  nombre:      string
  puesto:      string
}

interface DetalleAviso {
  leidos:     Destinatario[]
  pendientes: Destinatario[]
}

const PUESTO_LABEL: Record<string, string> = {
  staff:                 'Staff',
  entrenador:             'Entrenador',
  nutriologo:             'Nutriólogo',
  entrenador_nutriologo:  'Entrenador / Nutriólogo',
}

function fmtFecha(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch {
    return iso
  }
}

function nombreCompleto(p: Personal) {
  return `${p.nombres} ${p.apellido_paterno}${p.apellido_materno ? ` ${p.apellido_materno}` : ''}`.trim()
}

function Alerta({ tipo, mensaje, onClose }: { tipo: 'exito' | 'error'; mensaje: string; onClose: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold
      ${tipo === 'exito' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button type="button" onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

function ChipPuesto({ puesto }: { puesto: string }) {
  const colores: Record<string, string> = {
    staff:                 'bg-slate-100 text-slate-700',
    entrenador:            'bg-blue-100 text-blue-700',
    nutriologo:            'bg-emerald-100 text-emerald-700',
    entrenador_nutriologo: 'bg-violet-100 text-violet-700',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colores[puesto] ?? 'bg-gray-100 text-gray-600'}`}>
      {PUESTO_LABEL[puesto] ?? puesto}
    </span>
  )
}

export default function TabAvisos() {
  const [modo, setModo] = useState<ModoDestino>('grupos')
  const [seleccion, setSeleccion] = useState<Record<GrupoKey, boolean>>({
    todos: false, staff: false, entrenadores: false, nutriologos: false,
  })
  const [personalLista, setPersonalLista] = useState<Personal[]>([])
  const [cargandoPersonal, setCargandoPersonal] = useState(true)
  const [idsManual, setIdsManual] = useState<Set<number>>(new Set())
  const [busquedaManual, setBusquedaManual] = useState('')

  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)

  const [avisos, setAvisos] = useState<AvisoEnviado[]>([])
  const [cargandoAvisos, setCargandoAvisos] = useState(true)
  const [avisoAbierto, setAvisoAbierto] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<Record<number, DetalleAviso>>({})
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null)
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<number | null>(null)
  const [borrando, setBorrando] = useState<number | null>(null)

  const cargarAvisos = useCallback(async () => {
    setCargandoAvisos(true)
    try {
      const { data } = await axiosClient.get<AvisoEnviado[]>('/avisos')
      setAvisos(data)
    } catch { /* silencioso */ }
    finally { setCargandoAvisos(false) }
  }, [])

  useEffect(() => {
    cargarAvisos()
    getPersonal()
      .then(setPersonalLista)
      .catch(() => setPersonalLista([]))
      .finally(() => setCargandoPersonal(false))
  }, [cargarAvisos])

  const personalFiltrado = useMemo(() => {
    const q = busquedaManual.trim().toLowerCase()
    if (!q) return personalLista
    return personalLista.filter(p =>
      nombreCompleto(p).toLowerCase().includes(q) ||
      p.usuario.toLowerCase().includes(q) ||
      (PUESTO_LABEL[p.puesto] ?? p.puesto).toLowerCase().includes(q)
    )
  }, [personalLista, busquedaManual])

  const toggleGrupo = (key: GrupoKey) => {
    if (key === 'todos') {
      setSeleccion({ todos: !seleccion.todos, staff: false, entrenadores: false, nutriologos: false })
    } else {
      setSeleccion(prev => ({ ...prev, todos: false, [key]: !prev[key] }))
    }
  }

  const togglePersona = (id: number) => {
    setIdsManual(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionarTodosFiltrados = () => {
    setIdsManual(prev => {
      const next = new Set(prev)
      personalFiltrado.forEach(p => next.add(p.id_personal))
      return next
    })
  }

  const limpiarSeleccionManual = () => setIdsManual(new Set())

  const gruposActivos = (Object.keys(seleccion) as GrupoKey[]).filter(k => seleccion[k])
  const cantidadDestinatarios = modo === 'manual' ? idsManual.size : null

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)

    if (!mensaje.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El mensaje no puede estar vacío.' })
      return
    }

    if (modo === 'grupos' && gruposActivos.length === 0) {
      setAlerta({ tipo: 'error', mensaje: 'Selecciona al menos un grupo de destinatarios.' })
      return
    }
    if (modo === 'manual' && idsManual.size === 0) {
      setAlerta({ tipo: 'error', mensaje: 'Selecciona al menos una persona del personal.' })
      return
    }

    setEnviando(true)
    try {
      const payload = modo === 'manual'
        ? { mensaje: mensaje.trim(), ids_personal: [...idsManual] }
        : { mensaje: mensaje.trim(), destinatarios: gruposActivos }

      const { data } = await axiosClient.post<{ message: string }>('/avisos', payload)
      setAlerta({ tipo: 'exito', mensaje: data.message })
      setMensaje('')
      setSeleccion({ todos: false, staff: false, entrenadores: false, nutriologos: false })
      setIdsManual(new Set())
      cargarAvisos()
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al enviar el aviso.' })
    } finally {
      setEnviando(false)
    }
  }

  const tieneUnMes = (creado_en: string) =>
    Date.now() - new Date(creado_en).getTime() >= 30 * 24 * 60 * 60 * 1000

  const handleBorrar = async (id: number) => {
    setBorrando(id)
    setConfirmandoBorrar(null)
    try {
      await axiosClient.delete(`/avisos/${id}`)
      setAvisos(prev => prev.filter(a => a.id_aviso !== id))
      if (avisoAbierto === id) setAvisoAbierto(null)
      setAlerta({ tipo: 'exito', mensaje: 'Aviso eliminado correctamente.' })
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al eliminar el aviso.' })
    } finally {
      setBorrando(null)
    }
  }

  const toggleAviso = async (id: number) => {
    if (avisoAbierto === id) { setAvisoAbierto(null); return }
    setAvisoAbierto(id)
    if (detalle[id]) return
    setCargandoDetalle(id)
    try {
      const { data } = await axiosClient.get<DetalleAviso>(`/avisos/${id}/destinatarios`)
      setDetalle(prev => ({ ...prev, [id]: data }))
    } catch {
      setDetalle(prev => ({ ...prev, [id]: { leidos: [], pendientes: [] } }))
    } finally {
      setCargandoDetalle(null)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── ENVIAR AVISO ───────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e293b] to-[#334155] px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send size={20} className="text-[#fb923c]" />
            Enviar aviso al personal
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            Comunica novedades por grupo o elige empleados específicos.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

          <form onSubmit={handleEnviar} className="space-y-5">
            {/* Modo de destinatarios */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">¿A quién envías el aviso?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModo('grupos')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${modo === 'grupos'
                      ? 'border-[#ea580c] bg-orange-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                >
                  <Users className={`shrink-0 mt-0.5 ${modo === 'grupos' ? 'text-[#ea580c]' : 'text-gray-400'}`} size={22} />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Por grupo</p>
                    <p className="text-xs text-gray-500 mt-0.5">Staff, entrenadores, nutriólogos o todos</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setModo('manual')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${modo === 'manual'
                      ? 'border-[#ea580c] bg-orange-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                >
                  <UserCheck className={`shrink-0 mt-0.5 ${modo === 'manual' ? 'text-[#ea580c]' : 'text-gray-400'}`} size={22} />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Selección manual</p>
                    <p className="text-xs text-gray-500 mt-0.5">Elige una o varias personas</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Destinatarios por grupo */}
            {modo === 'grupos' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Grupos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GRUPOS.map(({ key, label, desc }) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors
                        ${seleccion[key]
                          ? 'bg-white border-[#ea580c] shadow-sm'
                          : 'bg-white/60 border-transparent hover:border-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccion[key]}
                        onChange={() => toggleGrupo(key)}
                        disabled={enviando}
                        className="mt-1 w-4 h-4 accent-[#ea580c] shrink-0"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">{label}</span>
                        <span className="text-xs text-gray-500">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Selección manual */}
            {modo === 'manual' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Personal ({idsManual.size} seleccionado{idsManual.size !== 1 ? 's' : ''})
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={seleccionarTodosFiltrados}
                      disabled={enviando || personalFiltrado.length === 0}
                      className="text-xs font-bold text-[#ea580c] hover:underline disabled:opacity-50"
                    >
                      Seleccionar visibles
                    </button>
                    <button
                      type="button"
                      onClick={limpiarSeleccionManual}
                      disabled={enviando || idsManual.size === 0}
                      className="text-xs font-bold text-gray-500 hover:underline disabled:opacity-50"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={busquedaManual}
                    onChange={e => setBusquedaManual(e.target.value)}
                    placeholder="Buscar por nombre, usuario o puesto..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c]/30"
                  />
                </div>

                {cargandoPersonal ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-4 border-gray-200 border-t-[#ea580c] rounded-full animate-spin" />
                  </div>
                ) : personalLista.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No hay personal activo en esta sucursal.</p>
                ) : personalFiltrado.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Sin resultados para la búsqueda.</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {personalFiltrado.map(p => {
                      const sel = idsManual.has(p.id_personal)
                      const foto = p.foto_url ? imageUrl(p.foto_url) : null
                      return (
                        <li key={p.id_personal}>
                          <button
                            type="button"
                            onClick={() => togglePersona(p.id_personal)}
                            disabled={enviando}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all
                              ${sel
                                ? 'bg-orange-50 border-[#ea580c] shadow-sm'
                                : 'bg-white border-gray-200 hover:border-gray-300'}`}
                          >
                            {sel
                              ? <CheckSquare className="text-[#ea580c] shrink-0" size={20} />
                              : <Square className="text-gray-300 shrink-0" size={20} />}
                            {foto ? (
                              <img src={foto} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-sm font-bold shrink-0">
                                {p.nombres.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{nombreCompleto(p)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <ChipPuesto puesto={p.puesto} />
                                <span className="text-[10px] text-gray-400">@{p.usuario}</span>
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Mensaje del aviso</label>
              <textarea
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                rows={4}
                disabled={enviando}
                placeholder="Escribe el contenido del aviso..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 resize-none
                  focus:outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20 disabled:opacity-60"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{mensaje.length} caracteres</p>
            </div>

            <button
              type="submit"
              disabled={enviando || (modo === 'manual' && idsManual.size === 0) || (modo === 'grupos' && gruposActivos.length === 0)}
              className="w-full sm:w-auto bg-[#ea580c] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#c94a0a]
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {enviando ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {enviando
                ? 'Enviando...'
                : modo === 'manual' && cantidadDestinatarios
                  ? `Enviar a ${cantidadDestinatarios} persona${cantidadDestinatarios !== 1 ? 's' : ''}`
                  : 'Enviar aviso'}
            </button>
          </form>
        </div>
      </section>

      {/* ── HISTORIAL ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Historial de avisos</h2>
        <p className="text-sm text-gray-500 mb-4">Últimos 20 avisos enviados y estado de lectura.</p>

        {cargandoAvisos ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-[#ea580c] rounded-full animate-spin" />
          </div>
        ) : avisos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
            <p className="text-gray-400 text-sm">Aún no has enviado avisos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {avisos.map(a => {
              const estaAbierto = avisoAbierto === a.id_aviso
              const cargando = cargandoDetalle === a.id_aviso
              const det = detalle[a.id_aviso]
              const todosLeidos = a.total_pendientes === 0
              const puedeEliminar = tieneUnMes(a.creado_en)
              const esBorrando = borrando === a.id_aviso
              const pidiendo = confirmandoBorrar === a.id_aviso
              const pct = a.total_destinatarios > 0
                ? Math.round((a.total_leidos / a.total_destinatarios) * 100)
                : 0

              return (
                <div key={a.id_aviso} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggleAviso(a.id_aviso)}
                      className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{a.mensaje}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmtFecha(a.creado_en)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:block w-24">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-[#ea580c]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 text-center">{pct}% leído</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          ✓ {a.total_leidos}
                        </span>
                        {a.total_pendientes > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                            ⏳ {a.total_pendientes}
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${estaAbierto ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {puedeEliminar && (
                      <div className="flex items-center border-l border-gray-100 px-3 shrink-0">
                        {!pidiendo ? (
                          <button
                            type="button"
                            onClick={() => setConfirmandoBorrar(a.id_aviso)}
                            disabled={esBorrando}
                            title="Eliminar aviso"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            {esBorrando ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => handleBorrar(a.id_aviso)}
                              className="text-xs bg-red-600 text-white font-bold px-2 py-1 rounded-lg">Sí</button>
                            <button type="button" onClick={() => setConfirmandoBorrar(null)}
                              className="text-xs bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded-lg">No</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {estaAbierto && (
                    <div className="border-t border-gray-100 bg-slate-50/80 px-4 py-4">
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mensaje</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.mensaje}</p>
                      </div>

                      {cargando ? (
                        <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#ea580c] rounded-full animate-spin" />
                          Cargando lecturas...
                        </div>
                      ) : det ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                              Pendientes ({det.pendientes.length})
                            </p>
                            {det.pendientes.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Todos leyeron ✅</p>
                            ) : (
                              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {det.pendientes.map(p => (
                                  <li key={p.id_personal}
                                    className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                                      {p.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                                      <ChipPuesto puesto={p.puesto} />
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                              Leídos ({det.leidos.length})
                            </p>
                            {det.leidos.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Nadie ha leído aún.</p>
                            ) : (
                              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {det.leidos.map(p => (
                                  <li key={p.id_personal}
                                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                    <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                                      {p.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                                      <ChipPuesto puesto={p.puesto} />
                                    </div>
                                    <span className="text-emerald-600 text-sm">✓</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {!cargando && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                          Enviado a <strong>{a.total_destinatarios}</strong> persona{a.total_destinatarios !== 1 ? 's' : ''} —{' '}
                          {todosLeidos
                            ? <span className="text-emerald-600 font-semibold">lectura completa</span>
                            : <><strong>{a.total_leidos}</strong> leídos, <strong className="text-amber-600">{a.total_pendientes}</strong> pendientes</>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
