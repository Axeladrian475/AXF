import { useState } from 'react'

const MOCK_PROMOS = [
  { id: 1, nombre: 'Mensual Promo', duracion: 30, precio: 300, sesiones_nutri: 0, sesiones_entrenador: 0, descripcion: '' },
  { id: 2, nombre: 'Sesiones', duracion: 0, precio: 100, sesiones_nutri: 10, sesiones_entrenador: 10, descripcion: '' },
]

export default function TabPromociones() {
  const [promos] = useState(MOCK_PROMOS)

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Gestión de promociones</h2>
      <hr className="border-gray-300 mb-4" />

      <p className="text-sm font-bold text-black mb-3">Crear Nueva Promoción</p>
      <form className="space-y-3 mb-6" onSubmit={e => e.preventDefault()}>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombre Promoción:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Duración (Días Adicionales):</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Precio: (MN)</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Límite de sesiones de nutriólogo:</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Límite de sesiones de entrenador:</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <button type="submit"
              className="w-full bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors">
              Guardar Promoción
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-black italic mb-1">Descripción:</label>
          <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
        </div>
      </form>

      <p className="text-sm font-bold text-black mb-2">Promociones Registradas</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Nombre</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Duración (Días Adicionales)</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Precio</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones nutriólogo</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones entrenador</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promos.map(p => (
              <tr key={p.id} className="bg-white">
                <td className="border border-gray-400 px-3 py-2 text-black">{p.nombre}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{p.duracion}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">${p.precio.toLocaleString()}.00</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{p.sesiones_nutri}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{p.sesiones_entrenador}</td>
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
