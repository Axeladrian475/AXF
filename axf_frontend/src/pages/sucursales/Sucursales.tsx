import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Datos de prueba
const DATOS_MOCK = [
  { id_sucursal: 1, nombre: 'Sucursal AxF Centro', direccion: 'Calle Falsa 123', codigo_postal: '44100', usuario: 'adminCentro', password: '********' },
  { id_sucursal: 2, nombre: 'Sucursal AxF Norte', direccion: 'Av. Principal 456', codigo_postal: '45010', usuario: 'adminNorte', password: '********' },
]

export default function Sucursales() {
  const [activeTab, setActiveTab] = useState<'agregar' | 'buscar' | 'modificar'>('agregar')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordTable, setShowPasswordTable] = useState<Record<number, boolean>>({})
  const [selectedSucursal, setSelectedSucursal] = useState<typeof DATOS_MOCK[0] | null>(null)
  const [showModifyPassword, setShowModifyPassword] = useState(false)

  const handleModify = (sucursal: typeof DATOS_MOCK[0]) => {
    setSelectedSucursal(sucursal)
    setActiveTab('modificar')
  }

  const togglePasswordVisibility = (id: number) => {
    setShowPasswordTable(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-[#e97632]">
      {/* HEADER CON TABS */}
      <div className="bg-[#1e293b] px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('agregar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'agregar'
                ? 'bg-[#ea580c] text-white border-[#ea580c]'
                : 'bg-white text-black border-black'
            }`}
          >
            Agregar Sucursales
          </button>
          <button
            onClick={() => setActiveTab('buscar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'buscar'
                ? 'bg-[#ea580c] text-white border-[#ea580c]'
                : 'bg-white text-black border-black'
            }`}
          >
            Buscar Sucursales
          </button>
          <button
            onClick={() => setActiveTab('modificar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'modificar'
                ? 'bg-[#ea580c] text-white border-[#ea580c]'
                : 'bg-white text-black border-black'
            }`}
          >
            Modificar
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4">
        <div className="bg-[#f5f5f5] rounded-lg border-[3px] border-[#ea580c] p-6">
          
          {/* TAB: AGREGAR SUCURSALES */}
          {activeTab === 'agregar' && (
            <div>
              <h2 className="text-xl font-bold text-black mb-1">Agregar Nueva Sucursal</h2>
              <hr className="border-gray-300 mb-4" />
              
              <form className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Nombre Sucursal:</label>
                  <input
                    type="text"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Dirección:</label>
                  <input
                    type="text"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Código Postal:</label>
                  <input
                    type="text"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
                  <input
                    type="text"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Contraseña:</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 pr-10 text-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: BUSCAR SUCURSALES */}
          {activeTab === 'buscar' && (
            <div>
              <h2 className="text-xl font-bold text-black mb-1">Buscar y Administrar Sucursales</h2>
              <hr className="border-gray-300 mb-4" />
              
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Buscar por nombre, dirección y codigo postal"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 max-w-md bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm"
                />
                <button className="bg-[#d9d9d9] border border-gray-500 text-black font-semibold px-6 py-2 rounded hover:bg-gray-300 transition-colors">
                  Guardar
                </button>
              </div>
              
              {/* TABLA */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-[#d9d9d9]">
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">ID</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">Nombre Sucursal</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">Dirección</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">C. Postal</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">Usuario Admin</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">Contraseña</th>
                      <th className="border border-gray-400 px-4 py-2 text-black font-bold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DATOS_MOCK.map((sucursal) => (
                      <tr key={sucursal.id_sucursal} className="bg-white">
                        <td className="border border-gray-400 px-4 py-2 text-center text-black">{sucursal.id_sucursal}</td>
                        <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.nombre}</td>
                        <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.direccion}</td>
                        <td className="border border-gray-400 px-4 py-2 text-center text-black">{sucursal.codigo_postal}</td>
                        <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.usuario}</td>
                        <td className="border border-gray-400 px-4 py-2 text-black">
                          <div className="flex items-center justify-between">
                            <span>{showPasswordTable[sucursal.id_sucursal] ? 'password123' : '********'}</span>
                            <button
                              onClick={() => togglePasswordVisibility(sucursal.id_sucursal)}
                              className="text-gray-600 ml-2"
                            >
                              {showPasswordTable[sucursal.id_sucursal] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </td>
                        <td className="border border-gray-400 px-4 py-2">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleModify(sucursal)}
                              className="bg-white border border-gray-400 text-black text-xs px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                            >
                              Modificar
                            </button>
                            <button className="bg-white border border-gray-400 text-black text-xs px-3 py-1 rounded hover:bg-gray-100 transition-colors">
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MODIFICAR */}
          {activeTab === 'modificar' && (
            <div>
              <h2 className="text-xl font-bold text-black mb-1">Modificar Sucursal</h2>
              <hr className="border-gray-300 mb-4" />
              
              {!selectedSucursal ? (
                <p className="text-black">
                  <span className="font-bold">Paso 1:</span> Utilice la función &apos;Buscar Sucursales&apos; para seleccionar la sucursal a modificar.
                </p>
              ) : (
                <form className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Nombre Sucursal:</label>
                    <input
                      type="text"
                      defaultValue={selectedSucursal.nombre}
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Dirección:</label>
                    <input
                      type="text"
                      defaultValue={selectedSucursal.direccion}
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Código Postal:</label>
                    <input
                      type="text"
                      defaultValue={selectedSucursal.codigo_postal}
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
                    <input
                      type="text"
                      defaultValue={selectedSucursal.usuario}
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Contraseña:</label>
                    <div className="relative">
                      <input
                        type={showModifyPassword ? 'text' : 'password'}
                        defaultValue="********"
                        className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 pr-10 text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowModifyPassword(!showModifyPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                      >
                        {showModifyPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
