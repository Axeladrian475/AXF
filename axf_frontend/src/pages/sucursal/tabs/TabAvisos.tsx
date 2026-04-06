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
  id_aviso:           number
  mensaje:            string
  creado_en:          string
  total_destinatarios: number
  total_leidos:       number
  total_pendientes:   number
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

function fmtFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

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
  const [vistaAbierta,   setVistaAbierta]   = useState<number | null>(null)

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
            {avisos.map(a => (
              <div key={a.id_aviso} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                {/* Cabecera */}
                <button
                  onClick={() => setVistaAbierta(vistaAbierta === a.id_aviso ? null : a.id_aviso)}
                  className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black truncate">{a.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtFecha(a.creado_en)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Badges lectura */}
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        ✓ {a.total_leidos} leídos
                      </span>
                      {a.total_pendientes > 0 && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          ⏳ {a.total_pendientes} pendientes
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs">{vistaAbierta === a.id_aviso ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Detalle expandible */}
                {vistaAbierta === a.id_aviso && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    <p className="text-sm text-black whitespace-pre-wrap">{a.mensaje}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Enviado a <strong>{a.total_destinatarios}</strong> persona{a.total_destinatarios !== 1 ? 's' : ''} —{' '}
                      <strong>{a.total_leidos}</strong> lo{a.total_leidos !== 1 ? 's' : ''} leyeron
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}