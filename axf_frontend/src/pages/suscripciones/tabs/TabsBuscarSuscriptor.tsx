import { useState } from 'react'

const MOCK = [
  { id: '#108', nombre: 'Luis Ramírez',         sucursal: 'AxF Centro', estado: 'ACTIVA' },
  { id: '#205', nombre: 'María Fernanda López',  sucursal: 'AxF Centro', estado: 'INACTIVA' },
]

interface Props { onGestionar: (id: string, nombre: string) => void }

export default function TabsBuscarSuscriptor({ onGestionar }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = MOCK.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-4">Gestión de Suscripciones</h2>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombres o Apellidos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 py-2 text-sm text-black bg-transparent outline-none"
          />
        </div>
        <select className="border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white">
          <option>AxF Centro</option>
          <option>AxF Norte</option>
          <option>AxF Sur</option>
        </select>
        <button className="bg-gray-700 text-white font-bold px-5 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
          Filtrar
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left font-bold text-black pb-2 pr-6">ID</th>
            <th className="text-left font-bold text-black pb-2 pr-6">Suscriptor</th>
            <th className="text-left font-bold text-black pb-2 pr-6">Sucursal</th>
            <th className="text-left font-bold text-black pb-2 pr-6">Estado Actual</th>
            <th className="text-left font-bold text-black pb-2">Acción</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(s => (
            <tr key={s.id} className="border-b border-gray-100">
              <td className="py-3 pr-6 text-black font-mono">{s.id}</td>
              <td className="py-3 pr-6 text-black font-bold">{s.nombre}</td>
              <td className="py-3 pr-6 text-black">{s.sucursal}</td>
              <td className="py-3 pr-6">
                <span className={`px-2 py-1 rounded text-xs font-black text-white ${s.estado === 'ACTIVA' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {s.estado}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => onGestionar(s.id, s.nombre)}
                  className="bg-[#1e293b] text-white text-xs font-bold px-4 py-2 rounded hover:bg-[#0f172a] transition-colors">
                  Gestionar Suscripción
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
