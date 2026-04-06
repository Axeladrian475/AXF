// ============================================================================
//  pages/sucursal/tabs/TabAvisos.tsx
//
//  MEJORAS:
//  1. fmtFecha usa toLocaleString + timezone México para fecha/hora correcta
//  2. Al expandir un aviso carga GET /api/avisos/:id/destinatarios y muestra
//     la lista de quién ya leyó y quién tiene pendiente el aviso.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../../../api/axiosClient'

const GRUPOS = [
  { key: 'todos',        label: 'Todo el personal' },
  { key: 'staff',        label: 'Staff' },
  { key: 'entrenadores', label: 'Entrenadores' },
  { key: 'nutriologos',  label: 'Nutriólogos' },
] as const

type GrupoKey = typeof GRUPOS[number]['key']

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

// ─── Etiquetas de puestos ────────────────────────────────────────────────────
const PUESTO_LABEL: Record<string, string> = {
  staff:                  'Staff',
  entrenador:             'Entrenador',
  nutriologo:             'Nutriólogo',
  entrenador_nutriologo:  'Entrenador / Nutriólogo',
}

// ─── Formato de fecha con timezone México ────────────────────────────────────
function fmtFecha(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day:      '2-digit',
      month:    'short',
      year:     'numeric',
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   true,
    })
  } catch {
    return iso
  }
}

function Alerta({ tipo, mensaje, onClose }: {
  tipo: 'exito' | 'error'; mensaje: string; onClose: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-bold mb-4
      ${tipo === 'exito' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800'}`}>
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

// ─── Chip de puesto ───────────────────────────────────────────────────────────
function ChipPuesto({ puesto }: { puesto: string }) {
  const colores: Record<string, string> = {
    staff:                 'bg-gray-100 text-gray-600',
    entrenador:            'bg-blue-100 text-blue-700',
    nutriologo:            'bg-green-100 text-green-700',
    entrenador_nutriologo: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colores[puesto] ?? 'bg-gray-100 text-gray-500'}`}>
      {PUESTO_LABEL[puesto] ?? puesto}
    </span>
  )
}

// =============================================================================
export default function TabAvisos() {
  const [seleccion, setSeleccion] = useState<Record<GrupoKey, boolean>>({
    todos: false, staff: false, entrenadores: false, nutriologos: false,
  })
  const [mensaje,  setMensaje]  = useState('')
  const [enviando, setEnviando] = useState(false)
  const [alerta,   setAlerta]   = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)

  // Avisos enviados
  const [avisos,         setAvisos]         = useState<AvisoEnviado[]>([])
  const [cargandoAvisos, setCargandoAvisos] = useState(true)

  // Aviso expandido y su detalle de destinatarios
  const [avisoAbierto,     setAvisoAbierto]     = useState<number | null>(null)
  const [detalle,          setDetalle]           = useState<Record<number, DetalleAviso>>({})
  const [cargandoDetalle,  setCargandoDetalle]   = useState<number | null>(null)

  const cargarAvisos = useCallback(async () => {
    setCargandoAvisos(true)
    try {
      const { data } = await axiosClient.get<AvisoEnviado[]>('/avisos')
      setAvisos(data)
    } catch {
      // silencioso
    } finally {
      setCargandoAvisos(false)
    }
  }, [])

  useEffect(() => { cargarAvisos() }, [])

  const toggle = (key: GrupoKey) => {
    if (key === 'todos') {
      setSeleccion({ todos: !seleccion.todos, staff: false, entrenadores: false, nutriologos: false })
    } else {
      setSeleccion(prev => ({ ...prev, todos: false, [key]: !prev[key] }))
    }
  }

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)
    const destinatarios = (Object.keys(seleccion) as GrupoKey[]).filter(k => seleccion[k])
    if (destinatarios.length === 0) {
      setAlerta({ tipo: 'error', mensaje: 'Selecciona al menos un grupo de destinatarios.' }); return
    }
    if (!mensaje.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El mensaje no puede estar vacío.' }); return
    }
    setEnviando(true)
    try {
      const { data } = await axiosClient.post<{ message: string; total_destinatarios: number }>(
        '/avisos', { mensaje: mensaje.trim(), destinatarios }
      )
      setAlerta({ tipo: 'exito', mensaje: data.message })
      setMensaje('')
      setSeleccion({ todos: false, staff: false, entrenadores: false, nutriologos: false })
      cargarAvisos()
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al enviar el aviso.' })
    } finally {
      setEnviando(false)
    }
  }

  // ── Expandir/cerrar aviso y cargar detalle si no lo tenemos ──────────────
  const toggleAviso = async (id: number) => {
    if (avisoAbierto === id) {
      setAvisoAbierto(null)
      return
    }
    setAvisoAbierto(id)

    // Ya tenemos el detalle en caché
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
    <div className="space-y-6">

      {/* ── FORMULARIO ENVIAR ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-black mb-1">Enviar Avisos al Personal</h2>
        <hr className="border-gray-300 mb-4" />

        {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

        <form className="space-y-4" onSubmit={handleEnviar}>
          <div>
            <p className="text-sm font-bold text-black mb-2">Seleccionar Destinatarios:</p>
            <div className="space-y-2 ml-4">
              {GRUPOS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={seleccion[key]} onChange={() => toggle(key)}
                    disabled={enviando} className="w-4 h-4 accent-[#ea580c]" />
                  <span className="text-sm font-bold text-black">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Mensaje:</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3}
              disabled={enviando} placeholder="Escribe el aviso para el personal..."
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black resize-none disabled:opacity-60" />
          </div>

          <button type="submit" disabled={enviando}
            className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
            {enviando && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {enviando ? 'Enviando...' : 'Enviar Aviso'}
          </button>
        </form>
      </div>

      {/* ── HISTORIAL DE AVISOS ENVIADOS ──────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-black mb-1">Avisos Enviados</h2>
        <hr className="border-gray-300 mb-4" />

        {cargandoAvisos ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-gray-300 border-t-[#ea580c] rounded-full animate-spin" />
          </div>
        ) : avisos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No hay avisos enviados aún.</p>
        ) : (
          <div className="space-y-3">
            {avisos.map(a => {
              const estaAbierto  = avisoAbierto === a.id_aviso
              const cargando     = cargandoDetalle === a.id_aviso
              const det          = detalle[a.id_aviso]
              const todosLeidos  = a.total_pendientes === 0

              return (
                <div key={a.id_aviso} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">

                  {/* ── Cabecera clickeable ───────────────────────────────── */}
                  <button
                    onClick={() => toggleAviso(a.id_aviso)}
                    className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{a.mensaje}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(a.creado_en)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Badges lectura */}
                      <div className="flex gap-1.5 text-xs font-bold">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                          ✓ {a.total_leidos} leídos
                        </span>
                        {a.total_pendientes > 0 && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ⏳ {a.total_pendientes} pendientes
                          </span>
                        )}
                      </div>
                      {/* Chevron */}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${estaAbierto ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* ── Detalle expandible ────────────────────────────────── */}
                  {estaAbierto && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">

                      {/* Texto completo del mensaje */}
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Mensaje completo</p>
                        <p className="text-sm text-black whitespace-pre-wrap">{a.mensaje}</p>
                      </div>

                      {/* Cargando detalle */}
                      {cargando ? (
                        <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#ea580c] rounded-full animate-spin" />
                          Cargando lecturas...
                        </div>
                      ) : det ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                          {/* ── Quién NO leyó ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                                Pendientes ({det.pendientes.length})
                              </p>
                            </div>
                            {det.pendientes.length === 0 ? (
                              <p className="text-xs text-gray-400 italic ml-4">Todos leyeron el aviso ✅</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {det.pendientes.map(p => (
                                  <li key={p.id_personal}
                                    className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                                    <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black shrink-0">
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

                          {/* ── Quién SÍ leyó ── */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              <p className="text-xs font-bold text-green-700 uppercase tracking-wide">
                                Leídos ({det.leidos.length})
                              </p>
                            </div>
                            {det.leidos.length === 0 ? (
                              <p className="text-xs text-gray-400 italic ml-4">Nadie ha leído este aviso aún.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {det.leidos.map(p => (
                                  <li key={p.id_personal}
                                    className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black shrink-0">
                                      {p.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                                      <ChipPuesto puesto={p.puesto} />
                                    </div>
                                    <svg className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0"
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                        </div>
                      ) : null}

                      {/* Resumen total */}
                      {!cargando && (
                        <p className="text-xs text-gray-400 mt-3 border-t border-gray-200 pt-2">
                          Enviado a <strong>{a.total_destinatarios}</strong> persona{a.total_destinatarios !== 1 ? 's' : ''} —{' '}
                          {todosLeidos
                            ? <span className="text-green-600 font-bold">todos lo leyeron ✅</span>
                            : <><strong>{a.total_leidos}</strong> leyeron, <strong className="text-orange-600">{a.total_pendientes}</strong> pendientes</>
                          }
                        </p>
                      )}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}