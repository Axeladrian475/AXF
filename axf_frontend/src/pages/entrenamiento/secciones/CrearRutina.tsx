import { useState } from 'react'
interface Props { onBack: () => void }

const SUSCRIPTORES = ['Ana López', 'Carlos Rivera', 'Luis Ramírez', 'María Fernanda López']
const EJERCICIOS_MOCK = [
  { id: 1, nombre: 'Press de Banca', img: null },
  { id: 2, nombre: 'Sentadilla',     img: null },
  { id: 3, nombre: 'Peso Muerto',    img: null },
  { id: 4, nombre: 'Jalón Polea',    img: null },
  { id: 5, nombre: 'Press Hombro',   img: null },
]

interface EjRutina { id: number; nombre: string; series: string; reps: string; descanso: string }

export default function CrearRutina({ onBack }: Props) {
  const [verificando, setVerificando] = useState(true)
  const [usuarioSel, setUsuarioSel] = useState('')
  const [busEj, setBusEj] = useState('')
  const [rutina, setRutina] = useState<EjRutina[]>([])
  const [notas, setNotas] = useState('')
  const [drag, setDrag] = useState<number | null>(null)

  const ejerciciosFiltrados = EJERCICIOS_MOCK.filter(e =>
    e.nombre.toLowerCase().includes(busEj.toLowerCase())
  )

  const agregar = (ej: typeof EJERCICIOS_MOCK[0]) => {
    setRutina(prev => [...prev, { id: Date.now(), nombre: ej.nombre, series: '3', reps: '10', descanso: '60s' }])
  }
  const actualizar = (id: number, campo: keyof EjRutina, val: string) => {
    setRutina(prev => prev.map(e => e.id === id ? { ...e, [campo]: val } : e))
  }
  const eliminar = (id: number) => setRutina(prev => prev.filter(e => e.id !== id))

  if (verificando) {
    return (
      <div className="p-4">
        <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-black">Crear Rutina</h2>
          </div>
          {/* Fondo borroso */}
          <div className="opacity-20 pointer-events-none">
            <div className="flex gap-4">
              <div className="w-48 space-y-2">
                {EJERCICIOS_MOCK.slice(0,3).map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-white border rounded-lg p-2">
                    <span className="text-xs font-bold text-black">{e.nombre}</span>
                    <span className="text-[#ea580c] font-bold text-lg">+</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-40" />
            </div>
          </div>

          {/* Modal */}
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-[#1e293b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-black text-lg mb-1">Verificación de Sesiones</h3>
              <p className="text-sm text-gray-500 mb-4">Seleccione al suscriptor para verificar disponibilidad.</p>
              <select value={usuarioSel} onChange={e => setUsuarioSel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black mb-4 bg-white">
                <option value="">Seleccione Usuario...</option>
                {SUSCRIPTORES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={() => { if (usuarioSel) setVerificando(false) }}
                disabled={!usuarioSel}
                className={`w-full font-bold py-2 rounded-lg text-white transition-colors ${usuarioSel ? 'bg-[#1e293b] hover:bg-[#0f172a]' : 'bg-gray-300 cursor-not-allowed'}`}>
                Verificar y Acceder
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Crear Rutina</h2>
          <span className="ml-auto text-sm text-gray-500 font-bold">Suscriptor: {usuarioSel}</span>
        </div>

        <div className="flex gap-4">
          {/* Panel ejercicios */}
          <div className="w-48 shrink-0">
            <input type="text" placeholder="Buscar ejercicio..." value={busEj}
              onChange={e => setBusEj(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-black mb-2 bg-white" />
            <div className="space-y-2">
              {ejerciciosFiltrados.map(ej => (
                <div key={ej.id} draggable onDragStart={() => setDrag(ej.id)}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2 hover:border-[#ea580c] transition-all cursor-grab">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded shrink-0" />
                    <span className="text-xs font-bold text-black">{ej.nombre}</span>
                  </div>
                  <button onClick={() => agregar(ej)} className="text-[#ea580c] font-bold text-lg leading-none">+</button>
                </div>
              ))}
            </div>
          </div>

          {/* Rutina */}
          <div className="flex-1">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={() => { const ej = EJERCICIOS_MOCK.find(e => e.id === drag); if (ej) agregar(ej) }}
              className="border-2 border-dashed border-gray-300 rounded-lg min-h-48 p-3 mb-3 bg-white">
              {rutina.length === 0 ? (
                <p className="text-gray-400 text-sm text-center mt-8">Arrastre ejercicios aquí o use el botón "+"</p>
              ) : (
                <div className="space-y-2">
                  {rutina.map(ej => (
                    <div key={ej.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2">
                      <div className="w-8 h-8 bg-gray-200 rounded shrink-0" />
                      <span className="font-bold text-sm text-black flex-1">{ej.nombre}</span>
                      <div className="flex gap-2 items-center">
                        <label className="text-xs text-gray-500">Series</label>
                        <input value={ej.series} onChange={e => actualizar(ej.id, 'series', e.target.value)}
                          className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        <label className="text-xs text-gray-500">Reps</label>
                        <input value={ej.reps} onChange={e => actualizar(ej.id, 'reps', e.target.value)}
                          className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        <label className="text-xs text-gray-500">Desc</label>
                        <input value={ej.descanso} onChange={e => actualizar(ej.id, 'descanso', e.target.value)}
                          className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs text-center text-black bg-white" />
                        <button onClick={() => eliminar(ej.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-black mb-1">Notas para el PDF:</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Instrucciones generales, advertencias..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white h-20 resize-none" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setRutina([])}
                className="bg-gray-500 text-white font-bold px-4 py-2 rounded text-xs hover:bg-gray-600 flex items-center gap-1">
                Limpiar
              </button>
              <button className="bg-blue-600 text-white font-bold px-4 py-2 rounded text-xs hover:bg-blue-700 flex items-center gap-1">
                Enviar Correo
              </button>
              <button className="bg-orange-500 text-white font-bold px-4 py-2 rounded text-xs hover:bg-orange-600 flex items-center gap-1">
                Enviar a App
              </button>
              <button className="bg-red-600 text-white font-bold px-4 py-2 rounded text-xs hover:bg-red-700 flex items-center gap-1">
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
