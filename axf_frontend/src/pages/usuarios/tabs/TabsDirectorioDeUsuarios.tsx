import { useState } from 'react'

const MOCK_USUARIOS = [
  { id: 'SUS-001', nombre: 'Juan Pérez López',     email: 'juan.perez@email.com',   tel: '55-1234-5678', sucursal: 'AxF Centro' },
  { id: 'SUS-002', nombre: 'Maria Gonzalez Ruiz',  email: 'maria.g@email.com',      tel: '55-8765-4321', sucursal: 'AxF Centro' },
  { id: 'SUS-003', nombre: 'Carlos Vega Díaz',     email: 'carlos.v@email.com',     tel: '33-4455-6677', sucursal: 'AxF Centro' },
]

export default function TabsDirectorioDeUsuarios() {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = MOCK_USUARIOS.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.id.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-4">Gestión de Suscriptores</h2>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido o ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 py-2 text-sm text-black bg-transparent outline-none"
          />
        </div>
        <button className="bg-gray-700 text-white font-bold px-6 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
          Buscar
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
            <th className="text-left font-bold text-black pb-2 pr-4">Nombre Completo</th>
            <th className="text-left font-bold text-black pb-2 pr-4">Correo Electrónico</th>
            <th className="text-left font-bold text-black pb-2 pr-4">Teléfono</th>
            <th className="text-left font-bold text-black pb-2 pr-4">Sucursal (Registro)</th>
            <th className="text-left font-bold text-black pb-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(u => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 text-black font-mono text-xs">{u.id}</td>
              <td className="py-3 pr-4 text-black font-bold">{u.nombre}</td>
              <td className="py-3 pr-4 text-black">{u.email}</td>
              <td className="py-3 pr-4 text-black">{u.tel}</td>
              <td className="py-3 pr-4 text-black">{u.sucursal}</td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-blue-600">Modificar</button>
                  <button className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600">Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
