import { useState, useMemo } from 'react'

interface Props { onBack: () => void }

const SUSCRIPTORES = [
  { id: 1, nombre: 'Ana López',             sesiones: 4 },
  { id: 2, nombre: 'Carlos Rivera',          sesiones: 0 },
  { id: 3, nombre: 'Luis Ramírez',           sesiones: 2 },
  { id: 4, nombre: 'María Fernanda López',   sesiones: 6 },
  { id: 5, nombre: 'Pedro Sánchez',          sesiones: 1 },
]

const EJERCICIOS_BASE = [
  { id: 1,  nombre: 'Press de Banca'       },
  { id: 2,  nombre: 'Sentadilla'           },
  { id: 3,  nombre: 'Peso Muerto'          },
  { id: 4,  nombre: 'Jalón Polea'          },
  { id: 5,  nombre: 'Press Hombro'         },
  { id: 6,  nombre: 'Curl de Bíceps'       },
  { id: 7,  nombre: 'Extensión Tríceps'    },
  { id: 8,  nombre: 'Remo con Barra'       },
  { id: 9,  nombre: 'Prensa de Piernas'    },
  { id: 10, nombre: 'Hip Thrust'           },
  { id: 11, nombre: 'Elevaciones Lat.'     },
  { id: 12, nombre: 'Plancha'              },
  { id: 13, nombre: 'Dominadas'            },
  { id: 14, nombre: 'Fondos en Paralelas'  },
]

// ── Tipos ──────────────────────────────────────────────────────────────────
interface EjRutina {
  uid: number
  nombre: string
  series: string
  reps: string
  descanso: string
}

interface Rutina {
  id: number
  nombre: string   // "Pecho", "Espalda", etc. — editable
  ejercicios: EjRutina[]
  notas: string
}

let _uid = 1
let _rid = 1

const newEj = (ej: typeof EJERCICIOS_BASE[0]): EjRutina =>
  ({ uid: _uid++, nombre: ej.nombre, series: '3', reps: '10', descanso: '60s' })

const newRutina = (nombre: string): Rutina =>
  ({ id: _rid++, nombre, ejercicios: [], notas: '' })

// ── Componente ─────────────────────────────────────────────────────────────
export default function CrearRutina({ onBack }: Props) {

  // Verificación
  const [verificando, setVerificando]   = useState(true)
  const [busVerif, setBusVerif]         = useState('')
  const [susSelId, setSusSelId]         = useState<number | null>(null)
  const [errorSesion, setErrorSesion]   = useState('')

  // Rutinas
  const [rutinas, setRutinas]           = useState<Rutina[]>([newRutina('Pecho')])
  const [idxActivo, setIdxActivo]       = useState(0)
  const [busEj, setBusEj]               = useState('')
  const [dragEjId, setDragEjId]         = useState<number | null>(null)
  const [email, setEmail]               = useState('')

  // ── Verificación helpers ───────────────────────────────────────────────
  const susFiltrados = useMemo(() =>
    SUSCRIPTORES.filter(s => s.nombre.toLowerCase().includes(busVerif.toLowerCase())),
    [busVerif]
  )
  const susSel = SUSCRIPTORES.find(s => s.id === susSelId) ?? null

  const verificar = () => {
    if (!susSel) { setErrorSesion('Selecciona un suscriptor.'); return }
    if (susSel.sesiones <= 0) {
      setErrorSesion(`Acceso denegado: ${susSel.nombre} no tiene sesiones de entrenamiento disponibles.`)
      return
    }
    setErrorSesion('')
    setVerificando(false)
  }

  // ── Rutinas helpers ────────────────────────────────────────────────────
  const rutina = rutinas[idxActivo] ?? rutinas[0]

  const mutarRutina = (fn: (r: Rutina) => Rutina) =>
    setRutinas(prev => prev.map((r, i) => i === idxActivo ? fn(r) : r))

  const agregarRutina = () => {
    const nombres = ['Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps', 'Cardio', 'Full Body', 'Glúteos']
    const usados  = rutinas.map(r => r.nombre)
    const libre   = nombres.find(n => !usados.includes(n)) ?? `Rutina ${rutinas.length + 1}`
    setRutinas(prev => [...prev, newRutina(libre)])
    setIdxActivo(rutinas.length)
  }

  const eliminarRutina = (idx: number) => {
    if (rutinas.length === 1) return
    setRutinas(prev => prev.filter((_, i) => i !== idx))
    setIdxActivo(Math.min(idxActivo, rutinas.length - 2))
  }

  const agregarEj = (ej: typeof EJERCICIOS_BASE[0]) =>
    mutarRutina(r => ({ ...r, ejercicios: [...r.ejercicios, newEj(ej)] }))

  const actualizarEj = (uid: number, campo: keyof EjRutina, val: string) =>
    mutarRutina(r => ({
      ...r,
      ejercicios: r.ejercicios.map(e => e.uid === uid ? { ...e, [campo]: val } : e)
    }))

  const eliminarEj = (uid: number) =>
    mutarRutina(r => ({ ...r, ejercicios: r.ejercicios.filter(e => e.uid !== uid) }))

  const ejerciciosFiltrados = EJERCICIOS_BASE.filter(e =>
    e.nombre.toLowerCase().includes(busEj.toLowerCase())
  )

  // ── MODAL VERIFICACIÓN ─────────────────────────────────────────────────
  if (verificando) {
    return (
      <div className="p-4">
        <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">

          {/* Título */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-black">Crear Rutina</h2>
          </div>

          {/* Fondo decorativo borroso */}
          <div className="opacity-20 pointer-events-none mb-4 flex gap-4">
            <div className="w-48 space-y-2">
              {EJERCICIOS_BASE.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white border rounded-lg p-2">
                  <span className="text-xs font-bold text-black">{e.nombre}</span>
                  <span className="text-[#ea580c] font-bold">+</span>
                </div>
              ))}
            </div>
            <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-32" />
          </div>

          {/* Modal */}
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">

              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-[#1e293b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-black text-lg mb-1 text-center">Verificación de Sesiones</h3>
              <p className="text-sm text-gray-500 mb-4 text-center">Seleccione al suscriptor para verificar disponibilidad.</p>

              {/* Barra de búsqueda */}
              <input
                type="text"
                placeholder="Buscar suscriptor..."
                value={busVerif}
                onChange={e => { setBusVerif(e.target.value); setSusSelId(null) }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black mb-1 focus:outline-none focus:border-[#ea580c]"
              />

              {/* Lista filtrada con sesiones */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 max-h-36 overflow-y-auto">
                {susFiltrados.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                )}
                {susFiltrados.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSusSelId(s.id); setBusVerif(s.nombre) }}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0
                      flex justify-between items-center transition-colors
                      ${susSelId === s.id
                        ? 'bg-[#ea580c] text-white font-bold'
                        : 'text-black hover:bg-orange-50'}`}
                  >
                    <span>{s.nombre}</span>
                    <span className={`text-xs font-bold ${
                      susSelId === s.id ? 'text-orange-100' :
                      s.sesiones > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {s.sesiones} sesión{s.sesiones !== 1 ? 'es' : ''}
                    </span>
                  </button>
                ))}
              </div>

              {errorSesion && (
                <p className="text-red-600 text-xs font-bold text-center mb-3">{errorSesion}</p>
              )}

              <div className="flex gap-2">
                <button onClick={onBack}
                  className="flex-1 border border-gray-300 text-black font-bold py-2 rounded text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={verificar}
                  disabled={!susSelId}
                  className={`flex-1 font-bold py-2 rounded text-sm text-white transition-colors
                    ${susSelId ? 'bg-[#1e293b] hover:bg-[#0f172a]' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  Verificar y Acceder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── INTERFAZ PRINCIPAL ─────────────────────────────────────────────────
  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-black">Crear Rutina</h2>
              <p className="text-xs text-gray-500">
                Suscriptor: <span className="font-bold text-[#ea580c]">{susSel?.nombre}</span>
                <span className="ml-2 text-green-600 font-bold">({susSel?.sesiones} sesiones)</span>
              </p>
            </div>
          </div>
          {/* Acciones entrega */}
          <div className="flex items-center gap-2">
            <button className="bg-gray-600 text-white font-bold px-3 py-1.5 rounded text-xs hover:bg-gray-700">
              🖨 PDF
            </button>
            <button className="bg-purple-600 text-white font-bold px-3 py-1.5 rounded text-xs hover:bg-purple-700">
              📱 App
            </button>
            <input type="email" placeholder="correo@..." value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs text-black w-32 bg-white" />
            <button className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded text-xs hover:bg-blue-700">
              📧
            </button>
          </div>
        </div>

        {/* ── Tabs de rutinas ── */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {rutinas.map((r, idx) => (
            <div key={r.id} className="flex items-center">
              <button
                onClick={() => setIdxActivo(idx)}
                className={`px-4 py-1.5 text-xs font-bold transition-all border-2
                  ${rutinas.length > 1 ? 'rounded-l-full border-r-0' : 'rounded-full'}
                  ${idxActivo === idx
                    ? 'bg-[#ea580c] text-white border-[#ea580c]'
                    : 'bg-white text-black border-black hover:bg-gray-50'}`}
              >
                {r.nombre}
                {r.ejercicios.length > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 font-black
                    ${idxActivo === idx ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {r.ejercicios.length}
                  </span>
                )}
              </button>
              {rutinas.length > 1 && (
                <button
                  onClick={() => eliminarRutina(idx)}
                  className={`px-2 py-1.5 text-xs font-bold rounded-r-full border-2 border-l-0 transition-all
                    ${idxActivo === idx
                      ? 'bg-[#c94a0a] text-white border-[#ea580c] hover:bg-red-600 hover:border-red-600'
                      : 'bg-white text-red-400 border-black hover:bg-red-50'}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={agregarRutina}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-white border-2 border-dashed border-gray-400
              text-gray-500 hover:border-[#ea580c] hover:text-[#ea580c] transition-all"
          >
            + Agregar Rutina
          </button>
        </div>

        {/* ── Contenido ── */}
        <div className="flex gap-4">

          {/* Panel ejercicios */}
          <div className="w-48 shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ejercicios</p>
            <input
              type="text" placeholder="Buscar ejercicio..."
              value={busEj} onChange={e => setBusEj(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs text-black mb-2 bg-white focus:outline-none focus:border-[#ea580c]"
            />
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-0.5">
              {ejerciciosFiltrados.map(ej => (
                <div
                  key={ej.id}
                  draggable
                  onDragStart={() => setDragEjId(ej.id)}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-2 py-1.5
                    hover:border-[#ea580c] transition-all cursor-grab group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded shrink-0 flex items-center justify-center text-gray-300 text-xs">💪</div>
                    <span className="text-xs font-bold text-black leading-tight">{ej.nombre}</span>
                  </div>
                  <button
                    onClick={() => agregarEj(ej)}
                    className="text-[#ea580c] font-black text-lg leading-none opacity-50 group-hover:opacity-100 shrink-0"
                  >+</button>
                </div>
              ))}
            </div>
          </div>

          {/* Rutina activa */}
          <div className="flex-1">
            {/* Nombre editable */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Rutina:</span>
                <input
                  value={rutina.nombre}
                  onChange={e => mutarRutina(r => ({ ...r, nombre: e.target.value }))}
                  className="border-b-2 border-[#ea580c] bg-transparent text-black font-black text-base
                    outline-none px-1 min-w-[80px] max-w-[200px]"
                />
              </div>
              <button
                onClick={() => mutarRutina(r => ({ ...r, ejercicios: [] }))}
                className="text-xs text-gray-400 hover:text-red-500 font-bold transition-colors"
              >
                🗑 Limpiar
              </button>
            </div>

            {/* Zona drop */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                const ej = EJERCICIOS_BASE.find(e => e.id === dragEjId)
                if (ej) agregarEj(ej)
                setDragEjId(null)
              }}
              className={`border-2 rounded-lg min-h-52 p-3 mb-3 transition-colors
                ${dragEjId ? 'border-[#ea580c] bg-orange-50' : 'border-dashed border-gray-300 bg-white'}`}
            >
              {rutina.ejercicios.length === 0 ? (
                <p className="text-gray-400 text-sm text-center mt-10">
                  Arrastra ejercicios aquí o usa el botón <strong>+</strong>
                </p>
              ) : (
                <div className="space-y-2">
                  {rutina.ejercicios.map(ej => (
                    <div key={ej.uid}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm shrink-0">💪</div>
                      <span className="font-bold text-sm text-black w-36 shrink-0">{ej.nombre}</span>
                      <div className="flex gap-3 items-center flex-1">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-400 whitespace-nowrap">Series</label>
                          <input value={ej.series}
                            onChange={e => actualizarEj(ej.uid, 'series', e.target.value)}
                            className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-400">Reps</label>
                          <input value={ej.reps}
                            onChange={e => actualizarEj(ej.uid, 'reps', e.target.value)}
                            className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-400 whitespace-nowrap">Desc.</label>
                          <input value={ej.descanso}
                            onChange={e => actualizarEj(ej.uid, 'descanso', e.target.value)}
                            className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        </div>
                      </div>
                      <button onClick={() => eliminarEj(ej.uid)}
                        className="text-red-400 hover:text-red-600 text-sm font-bold shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas de la rutina activa */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-black mb-1">
                Notas para "{rutina.nombre}":
              </label>
              <textarea
                value={rutina.notas}
                onChange={e => mutarRutina(r => ({ ...r, notas: e.target.value }))}
                placeholder="Instrucciones, técnica, advertencias..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white h-16 resize-none focus:outline-none focus:border-[#ea580c]"
              />
            </div>

            {/* Resumen general si hay más de 1 rutina */}
            {rutinas.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Plan completo</p>
                <div className="flex flex-wrap gap-2">
                  {rutinas.map(r => (
                    <div key={r.id}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-bold cursor-pointer transition-colors
                        ${r.id === rutina.id
                          ? 'bg-[#ea580c] text-white border-[#ea580c]'
                          : 'bg-gray-50 text-black border-gray-200 hover:border-[#ea580c]'}`}
                      onClick={() => setIdxActivo(rutinas.findIndex(x => x.id === r.id))}
                    >
                      {r.nombre}
                      <span className={`font-black ${r.id === rutina.id ? 'text-orange-200' : 'text-[#ea580c]'}`}>
                        {r.ejercicios.length} ej.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guardar */}
            <div className="flex justify-end">
              <button className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm">
                💾 Guardar Plan ({rutinas.length} rutina{rutinas.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
