import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  getSucursales,
  crearSucursal,
  modificarSucursal,
  eliminarSucursal,
  type Sucursal,
  type SucursalFormData,
} from '../../api/sucursalesApi'

const FORM_VACIO: SucursalFormData = {
  nombre: '',
  direccion: '',
  codigo_postal: '',
  usuario: '',
  password: '',
}

export default function Sucursales() {
  const [activeTab, setActiveTab] = useState<'agregar' | 'buscar' | 'modificar'>('agregar')

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')

  // ── Formulario Agregar ─────────────────────────────────────────────────────
  const [formAgregar, setFormAgregar] = useState<SucursalFormData>(FORM_VACIO)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingAgregar, setLoadingAgregar] = useState(false)

  // ── Formulario Modificar ───────────────────────────────────────────────────
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null)
  const [formModificar, setFormModificar] = useState<SucursalFormData>(FORM_VACIO)
  const [showModifyPassword, setShowModifyPassword] = useState(false)
  const [loadingModificar, setLoadingModificar] = useState(false)

  // ── Tabla: visibilidad de contraseñas ─────────────────────────────────────
  const [showPasswordTable, setShowPasswordTable] = useState<Record<number, boolean>>({})

  // ── Confirmación de eliminación ────────────────────────────────────────────
  const [confirmEliminar, setConfirmEliminar] = useState<Sucursal | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  // Cargar sucursales al montar
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarSucursales()
  }, [])

  const cargarSucursales = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSucursales()
      setSucursales(data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar sucursales')
    } finally {
      setLoading(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────
  const mostrarExito = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const togglePasswordVisibility = (id: number) => {
    setShowPasswordTable(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const sucursalesFiltradas = sucursales.filter(s =>
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.codigo_postal.includes(searchTerm)
  )

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers: Agregar
  // ────────────────────────────────────────────────────────────────────────────
  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAgregar.password) {
      setError('La contraseña es requerida para una nueva sucursal')
      return
    }
    setLoadingAgregar(true)
    setError(null)
    try {
      await crearSucursal(formAgregar)
      setFormAgregar(FORM_VACIO)
      mostrarExito('Sucursal creada correctamente')
      await cargarSucursales()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear la sucursal')
    } finally {
      setLoadingAgregar(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers: Modificar
  // ────────────────────────────────────────────────────────────────────────────
  const handleModify = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal)
    setFormModificar({
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      codigo_postal: sucursal.codigo_postal,
      usuario: sucursal.usuario,
      password: '',
    })
    setActiveTab('modificar')
  }

  const handleModificar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSucursal) return
    setLoadingModificar(true)
    setError(null)
    try {
      await modificarSucursal(selectedSucursal.id_sucursal, formModificar)
      mostrarExito('Sucursal actualizada correctamente')
      await cargarSucursales()
      setSelectedSucursal(null)
      setActiveTab('buscar')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar la sucursal')
    } finally {
      setLoadingModificar(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers: Eliminar
  // ────────────────────────────────────────────────────────────────────────────
  const handleConfirmarEliminar = async () => {
    if (!confirmEliminar) return
    try {
      await eliminarSucursal(confirmEliminar.id_sucursal)
      mostrarExito('Sucursal eliminada correctamente')
      setConfirmEliminar(null)
      await cargarSucursales()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al eliminar la sucursal')
      setConfirmEliminar(null)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#F26A21]">

      {/* NOTIFICACIONES */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-lg shadow-lg font-semibold">
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg font-semibold">
          ✗ {error}
          <button onClick={() => setError(null)} className="ml-3 underline text-sm">Cerrar</button>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: ELIMINAR */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-black mb-2">¿Eliminar sucursal?</h3>
            <p className="text-gray-600 text-sm mb-5">
              La sucursal <span className="font-bold text-black">{confirmEliminar.nombre}</span> será
              eliminada permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmEliminar(null)}
                className="px-4 py-2 border border-gray-400 rounded text-black text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CON TABS */}
      <div className="bg-[#1e293b] px-4 py-3 rounded-full">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('agregar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'agregar'
                ? 'bg-[#F26A21] text-white border-[#F26A21]'
                : 'bg-white text-black border-black'
            }`}
          >
            Agregar Sucursales
          </button>
          <button
            onClick={() => setActiveTab('buscar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'buscar'
                ? 'bg-[#F26A21] text-white border-[#F26A21]'
                : 'bg-white text-black border-black'
            }`}
          >
            Buscar Sucursales
          </button>
          <button
            onClick={() => setActiveTab('modificar')}
            className={`px-6 py-2 rounded-full font-bold text-base transition-all border-2 ${
              activeTab === 'modificar'
                ? 'bg-[#F26A21] text-white border-[#F26A21]'
                : 'bg-white text-black border-black'
            }`}
          >
            Modificar
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4">
        <div className="bg-[#f5f5f5] rounded-lg p-8">

          {/* TAB: AGREGAR SUCURSALES */}
          {activeTab === 'agregar' && (
            <div>
              <h2 className="text-xl font-bold text-black mb-1">Agregar Nueva Sucursal</h2>
              <hr className="border-gray-300 mb-4" />

              <form onSubmit={handleAgregar} className="space-y-3" autoComplete="off">
                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Nombre Sucursal:</label>
                  <input
                    type="text"
                    value={formAgregar.nombre}
                    onChange={e => setFormAgregar({ ...formAgregar, nombre: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Dirección:</label>
                  <input
                    type="text"
                    value={formAgregar.direccion}
                    onChange={e => setFormAgregar({ ...formAgregar, direccion: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Código Postal:</label>
                  <input
                    type="text"
                    value={formAgregar.codigo_postal}
                    onChange={e => setFormAgregar({ ...formAgregar, codigo_postal: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
                  <input
                    type="text"
                    value={formAgregar.usuario}
                    onChange={e => setFormAgregar({ ...formAgregar, usuario: e.target.value })}
                    required
                    autoComplete="off"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black italic mb-1">Contraseña:</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formAgregar.password}
                      onChange={e => setFormAgregar({ ...formAgregar, password: e.target.value })}
                      required
                      autoComplete="new-password"
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
                    disabled={loadingAgregar}
                    className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60"
                  >
                    {loadingAgregar ? 'Guardando...' : 'Guardar'}
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
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 max-w-md bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm"
                />
                <button
                  onClick={cargarSucursales}
                  className="bg-[#d9d9d9] border border-gray-500 text-black font-semibold px-6 py-2 rounded hover:bg-gray-300 transition-colors"
                >
                  Actualizar
                </button>
              </div>

              {/* TABLA */}
              {loading ? (
                <p className="text-gray-600 text-sm">Cargando sucursales...</p>
              ) : (
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
                      {sucursalesFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-gray-400 px-4 py-4 text-center text-gray-500 text-sm">
                            No se encontraron sucursales
                          </td>
                        </tr>
                      ) : (
                        sucursalesFiltradas.map(sucursal => (
                          <tr key={sucursal.id_sucursal} className="bg-white">
                            <td className="border border-gray-400 px-4 py-2 text-center text-black">{sucursal.id_sucursal}</td>
                            <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.nombre}</td>
                            <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.direccion}</td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-black">{sucursal.codigo_postal}</td>
                            <td className="border border-gray-400 px-4 py-2 text-black">{sucursal.usuario}</td>
                            <td className="border border-gray-400 px-4 py-2 text-black">
                              <div className="flex items-center justify-between">
                                <span>{showPasswordTable[sucursal.id_sucursal] ? '(hash oculto)' : '********'}</span>
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
                                <button
                                  onClick={() => setConfirmEliminar(sucursal)}
                                  className="bg-white border border-gray-400 text-black text-xs px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
                <form onSubmit={handleModificar} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Nombre Sucursal:</label>
                    <input
                      type="text"
                      value={formModificar.nombre}
                      onChange={e => setFormModificar({ ...formModificar, nombre: e.target.value })}
                      required
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Dirección:</label>
                    <input
                      type="text"
                      value={formModificar.direccion}
                      onChange={e => setFormModificar({ ...formModificar, direccion: e.target.value })}
                      required
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Código Postal:</label>
                    <input
                      type="text"
                      value={formModificar.codigo_postal}
                      onChange={e => setFormModificar({ ...formModificar, codigo_postal: e.target.value })}
                      required
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
                    <input
                      type="text"
                      value={formModificar.usuario}
                      onChange={e => setFormModificar({ ...formModificar, usuario: e.target.value })}
                      required
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black italic mb-1">
                      Contraseña: <span className="font-normal text-gray-500">(dejar vacío para no cambiar)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showModifyPassword ? 'text' : 'password'}
                        value={formModificar.password}
                        onChange={e => setFormModificar({ ...formModificar, password: e.target.value })}
                        placeholder="••••••••"
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

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={loadingModificar}
                      className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60"
                    >
                      {loadingModificar ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedSucursal(null); setActiveTab('buscar') }}
                      className="bg-white border border-gray-400 text-black font-bold px-6 py-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
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