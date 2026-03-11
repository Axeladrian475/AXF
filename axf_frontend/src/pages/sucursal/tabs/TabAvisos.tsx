import { useState } from 'react'
import axiosClient from '../../../api/axiosClient'

// Grupos de destinatarios disponibles
const GRUPOS = [
  { key: 'todos',        label: 'Todo el personal' },
  { key: 'staff',        label: 'Staff' },
  { key: 'entrenadores', label: 'Entrenadores' },
  { key: 'nutriologos',  label: 'Nutriólogos' },
] as const

type GrupoKey = typeof GRUPOS[number]['key']

// ─── Alerta reutilizable ──────────────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: {
  tipo: 'exito' | 'error'
  mensaje: string
  onClose: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-bold mb-4
      ${tipo === 'exito'
        ? 'bg-green-50 border-green-400 text-green-800'
        : 'bg-red-50 border-red-400 text-red-800'}`}
    >
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TabAvisos() {
  const [seleccion, setSeleccion] = useState<Record<GrupoKey, boolean>>({
    todos:        false,
    staff:        false,
    entrenadores: false,
    nutriologos:  false,
  })
  const [mensaje,   setMensaje]   = useState('')
  const [enviando,  setEnviando]  = useState(false)
  const [alerta,    setAlerta]    = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)

  // Marcar "Todo el personal" desmarca los demás y viceversa
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

    // Validación local
    const destinatarios = (Object.keys(seleccion) as GrupoKey[]).filter(k => seleccion[k])
    if (destinatarios.length === 0) {
      setAlerta({ tipo: 'error', mensaje: 'Selecciona al menos un grupo de destinatarios.' })
      return
    }
    if (!mensaje.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El mensaje no puede estar vacío.' })
      return
    }

    setEnviando(true)
    try {
      const { data } = await axiosClient.post<{ message: string; total_destinatarios: number }>(
        '/avisos',
        { mensaje: mensaje.trim(), destinatarios }
      )

      setAlerta({ tipo: 'exito', mensaje: data.message })
      // Limpiar formulario tras éxito
      setMensaje('')
      setSeleccion({ todos: false, staff: false, entrenadores: false, nutriologos: false })

    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al enviar el aviso.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Enviar Avisos al Personal</h2>
      <hr className="border-gray-300 mb-4" />

      {alerta && (
        <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />
      )}

      <form className="space-y-4" onSubmit={handleEnviar}>
        {/* Destinatarios */}
        <div>
          <p className="text-sm font-bold text-black mb-2">Seleccionar Destinatarios:</p>
          <div className="space-y-2 ml-4">
            {GRUPOS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seleccion[key]}
                  onChange={() => toggle(key)}
                  disabled={enviando}
                  className="w-4 h-4 accent-[#ea580c]"
                />
                <span className="text-sm font-bold text-black">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-bold text-black italic mb-1">Mensaje:</label>
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            rows={3}
            disabled={enviando}
            placeholder="Escribe el aviso para el personal..."
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black resize-none disabled:opacity-60"
          />
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={enviando}
          className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {enviando && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {enviando ? 'Enviando...' : 'Enviar Aviso'}
        </button>
      </form>
    </div>
  )
}