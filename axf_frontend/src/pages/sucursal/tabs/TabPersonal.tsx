import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const PUESTOS = ['staff', 'entrenador', 'nutriologo', 'entrenador_nutriologo']
const PUESTOS_LABEL: Record<string, string> = {
  staff: 'Staff',
  entrenador: 'Entrenador',
  nutriologo: 'Nutriólogo',
  entrenador_nutriologo: 'Entrenador/Nutriólogo',
}

const MOCK_PERSONAL = [
  { id: 101, nombre: 'Axel Aguirre', puesto: 'entrenador', usuario: 'axl_agr' },
  { id: 102, nombre: 'Alfonso Amezcua', puesto: 'nutriologo', usuario: 'alf_amz' },
]

export default function TabPersonal() {
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPersonal, setSelectedPersonal] = useState<typeof MOCK_PERSONAL[0] | null>(null)

  const filtrado = MOCK_PERSONAL.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.usuario.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Gestión de Personal</h2>
      <hr className="border-gray-300 mb-4" />

      {/* AGREGAR */}
      <p className="text-sm font-bold text-black mb-3">Agregar Nuevo Empleado</p>
      <form className="space-y-3 mb-6" onSubmit={e => e.preventDefault()}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombres:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Apellido Paterno:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Apellido Materno:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Edad:</label>
            <input type="number" className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Sexo:</label>
            <select className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Puesto:</label>
            <select className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
              <option value="">Seleccionar</option>
              {PUESTOS.map(p => (
                <option key={p} value={p}>{PUESTOS_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
            <input className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Contraseña:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 pr-10 text-black"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Fotografía:</label>
            <input type="file" accept="image/*"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black text-sm" />
          </div>
        </div>

        <button type="submit"
          className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors mt-1">
          Agregar Nuevo Empleado
        </button>
      </form>

      {/* BUSCAR Y TABLA */}
      <p className="text-sm font-bold text-black mb-2">Buscar y Administrar Personal</p>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-sm bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">ID</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Nombre Completo</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Puesto</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Usuario</th>
              <th className="border border-gray-400 px-3 py-2 text-black font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map(p => (
              <tr key={p.id} className="bg-white">
                <td className="border border-gray-400 px-3 py-2 text-black">{p.id}</td>
                <td className="border border-gray-400 px-3 py-2 text-black font-bold">{p.nombre}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{PUESTOS_LABEL[p.puesto]}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{p.usuario}</td>
                <td className="border border-gray-400 px-3 py-2">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setSelectedPersonal(p)}
                      className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a]">
                      Modificar
                    </button>
                    <button className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-yellow-600">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL MODIFICAR inline */}
      {selectedPersonal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Modificar: {selectedPersonal.nombre}</h3>
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); setSelectedPersonal(null) }}>
              <div>
                <label className="block text-sm font-bold italic mb-1">Puesto:</label>
                <select defaultValue={selectedPersonal.puesto}
                  className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2">
                  {PUESTOS.map(p => <option key={p} value={p}>{PUESTOS_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold italic mb-1">Usuario:</label>
                <input defaultValue={selectedPersonal.usuario}
                  className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a]">
                  Guardar
                </button>
                <button type="button" onClick={() => setSelectedPersonal(null)}
                  className="bg-gray-300 text-black font-bold px-6 py-2 rounded hover:bg-gray-400">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
