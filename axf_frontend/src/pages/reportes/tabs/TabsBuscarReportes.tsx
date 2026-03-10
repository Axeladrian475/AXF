import { useState } from 'react'

const MOCK_REPORTES = [
  { id: 101, nivel: 3, sucursal: 'AxF Centro',  categoria: 'Máquina Dañada', suscriptor: 'Laura Martinez', foto: true },
  { id: 102, nivel: 2, sucursal: 'AxF Norte',   categoria: 'Baño Tapado',    suscriptor: 'Pedro Sánchez',  foto: false },
  { id: 105, nivel: 1, sucursal: 'AxF Sur',     categoria: 'Limpieza',       suscriptor: 'Ana García',     foto: true },
]

const STRIKE_STYLE: Record<number, string> = {
  1: 'bg-yellow-400 text-black',
  2: 'bg-orange-500 text-white',
  3: 'bg-red-600 text-white',
}

export default function TabsBuscarReportes() {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = MOCK_REPORTES.filter(r =>
    String(r.id).includes(busqueda) ||
    r.suscriptor.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.sucursal.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Buscar y Administrar Reportes</h2>
      <hr className="border-gray-300 mb-4" />

      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por ID, nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 max-w-sm bg-white border border-gray-300 rounded px-3 py-2 text-sm text-black"
        />
        <button className="bg-gray-500 text-white font-bold px-5 py-2 rounded text-sm hover:bg-gray-600 transition-colors">
          Buscar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Nivel Alerta</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Sucursal / Categoría</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Suscriptor</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Evidencia</th>
              <th className="text-left font-bold text-black pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(r => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-3 pr-4 text-black font-bold">{r.id}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-1 rounded text-xs font-black ${STRIKE_STYLE[r.nivel]}`}>
                    {r.nivel}er STRIKE
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <p className="font-bold text-black text-sm">{r.sucursal}</p>
                  <p className="text-gray-500 text-xs">{r.categoria}</p>
                </td>
                <td className="py-3 pr-4 text-black">{r.suscriptor}</td>
                <td className="py-3 pr-4">
                  {r.foto
                    ? <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"><span>🖼</span> Ver Foto</button>
                    : <span className="text-gray-400 text-xs">Sin imagen</span>
                  }
                </td>
                <td className="py-3">
                  <div className="flex gap-1 flex-wrap">
                    <button className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded hover:bg-blue-600">Actualizar Estado</button>
                    <button className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded hover:bg-green-700">Resolver Caso</button>
                    <button className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded hover:bg-gray-600">Historial Strike</button>
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
