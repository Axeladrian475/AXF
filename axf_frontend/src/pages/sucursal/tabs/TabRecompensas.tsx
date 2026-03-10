import { useState } from 'react'

const MOCK_RECOMPENSAS = [
  { id: 1, nombre: 'Botella de Agua (AxF Pro)', puntos: 500 },
]

export default function TabRecompensas() {
  const [recompensas] = useState(MOCK_RECOMPENSAS)

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Configuración de Recompensas por Puntos</h2>
      <hr className="border-gray-300 mb-4" />

      <p className="text-sm font-bold text-black mb-3">Agregar Nueva Recompensa</p>
      <form className="mb-6" onSubmit={e => e.preventDefault()}>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombre de la Recompensa:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Costo en Puntos:</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <button type="submit"
              className="w-full bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors">
              Guardar Recompensa
            </button>
          </div>
        </div>
      </form>

      <p className="text-sm font-bold text-black mb-2">Recompensas Disponibles para Canje</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-[#fecaca]">
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Nombre</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Costo en Puntos</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recompensas.map(r => (
              <tr key={r.id} className="bg-white">
                <td className="border border-gray-400 px-3 py-2 text-black">{r.nombre}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{r.puntos}</td>
                <td className="border border-gray-400 px-3 py-2">
                  <div className="flex gap-2 justify-center">
                    <button className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a]">Modificar</button>
                    <button className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-yellow-600">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
