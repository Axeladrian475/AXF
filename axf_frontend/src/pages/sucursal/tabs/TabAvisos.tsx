import { useState } from 'react'

export default function TabAvisos() {
  const [seleccion, setSeleccion] = useState({
    todos: false,
    staff: false,
    entrenadores: false,
    nutriologos: false,
  })
  const [mensaje, setMensaje] = useState('')

  const toggle = (key: keyof typeof seleccion) =>
    setSeleccion(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Enviar Avisos al Personal</h2>
      <hr className="border-gray-300 mb-4" />

      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <div>
          <p className="text-sm font-bold text-black mb-2">Seleccionar Destinatarios:</p>
          <div className="space-y-2 ml-4">
            {([
              ['todos', 'Todo el personal'],
              ['staff', 'Staff'],
              ['entrenadores', 'Entrenadores'],
              ['nutriologos', 'Nutriólogos'],
            ] as [keyof typeof seleccion, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seleccion[key]}
                  onChange={() => toggle(key)}
                  className="w-4 h-4 accent-[#ea580c]"
                />
                <span className="text-sm font-bold text-black">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-black italic mb-1">Mensaje:</label>
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            rows={3}
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black resize-none"
          />
        </div>

        <button
          type="submit"
          className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors"
        >
          Enviar Aviso
        </button>
      </form>
    </div>
  )
}
