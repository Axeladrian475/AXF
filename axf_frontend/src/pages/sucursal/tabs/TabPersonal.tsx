import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  getPersonal,
  crearPersonal,
  modificarPersonal,
  eliminarPersonal,
  type Personal,
} from '../../../api/personalApi'

const PUESTOS = ['staff', 'entrenador', 'nutriologo', 'entrenador_nutriologo'] as const
const PUESTOS_LABEL: Record<string, string> = {
  staff: 'Staff',
  entrenador: 'Entrenador',
  nutriologo: 'Nutriólogo',
  entrenador_nutriologo: 'Entrenador/Nutriólogo',
}

// URL base del backend para construir la ruta de las fotos
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

const FORM_VACIO = {
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  edad: '',
  sexo: '',
  puesto: '',
  usuario: '',
  password: '',
}

export default function TabPersonal() {
  // ── Datos ──────────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Formulario Agregar ─────────────────────────────────────────────────────
  const [form, setForm] = useState(FORM_VACIO)
  const [foto, setFoto] = useState<File | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingAgregar, setLoadingAgregar] = useState(false)

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')

  // ── Modal Modificar ────────────────────────────────────────────────────────
  const [selectedPersonal, setSelectedPersonal] = useState<Personal | null>(null)
  const [formMod, setFormMod] = useState(FORM_VACIO)
  const [fotoMod, setFotoMod] = useState<File | null>(null)
  const [showPasswordMod, setShowPasswordMod] = useState(false)
  const [loadingMod, setLoadingMod] = useState(false)

  // ── Confirmar eliminación ──────────────────────────────────────────────────
  const [confirmEliminar, setConfirmEliminar] = useState<Personal | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => { cargarPersonal() }, [])

  const cargarPersonal = async () => {
    setLoading(true)
    try {
      setPersonal(await getPersonal())
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar personal')
    } finally {
      setLoading(false)
    }
  }

  const mostrarExito = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const filtrado = personal.filter(p =>
    `${p.nombres} ${p.apellido_paterno}`.toLowerCase().includes(search.toLowerCase()) ||
    p.usuario.toLowerCase().includes(search.toLowerCase())
  )

  // ── Foto helper ────────────────────────────────────────────────────────────
  // foto_url en BD es "/uploads/personal/archivo.jpg"
  // La construimos como "http://localhost:3001/uploads/personal/archivo.jpg"
  const fotoSrc = (foto_url: string | null) =>
    foto_url ? `${API_BASE}${foto_url}` : null

  // ────────────────────────────────────────────────────────────────────────────
  // Agregar
  // ────────────────────────────────────────────────────────────────────────────
  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingAgregar(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (foto) fd.append('foto', foto)
      await crearPersonal(fd)
      setForm(FORM_VACIO)
      setFoto(null)
      // Limpiar el input file manualmente
      const fileInput = document.getElementById('foto-agregar') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      mostrarExito('Empleado agregado correctamente')
      await cargarPersonal()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al agregar empleado')
    } finally {
      setLoadingAgregar(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Modificar
  // ────────────────────────────────────────────────────────────────────────────
  const abrirModificar = (p: Personal) => {
    setSelectedPersonal(p)
    setFormMod({
      nombres: p.nombres,
      apellido_paterno: p.apellido_paterno,
      apellido_materno: p.apellido_materno || '',
      edad: String(p.edad),
      sexo: p.sexo,
      puesto: p.puesto,
      usuario: p.usuario,
      password: '',
    })
    setFotoMod(null)
  }

  const handleModificar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonal) return
    setLoadingMod(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(formMod).forEach(([k, v]) => fd.append(k, v))
      if (fotoMod) fd.append('foto', fotoMod)
      await modificarPersonal(selectedPersonal.id_personal, fd)
      mostrarExito('Empleado actualizado correctamente')
      setSelectedPersonal(null)
      await cargarPersonal()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar empleado')
    } finally {
      setLoadingMod(false)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Eliminar
  // ────────────────────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmEliminar) return
    try {
      await eliminarPersonal(confirmEliminar.id_personal)
      mostrarExito('Empleado eliminado correctamente')
      setConfirmEliminar(null)
      await cargarPersonal()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al eliminar empleado')
      setConfirmEliminar(null)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div>
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

      {/* MODAL ELIMINAR */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-black mb-2">¿Eliminar empleado?</h3>
            <p className="text-gray-600 text-sm mb-5">
              <span className="font-bold text-black">
                {confirmEliminar.nombres} {confirmEliminar.apellido_paterno}
              </span> será eliminado permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmEliminar(null)}
                className="px-4 py-2 border border-gray-400 rounded text-black text-sm hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR */}
      {selectedPersonal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              Modificar: {selectedPersonal.nombres} {selectedPersonal.apellido_paterno}
            </h3>
            <form className="space-y-3" onSubmit={handleModificar} autoComplete="off">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Nombres:</label>
                  <input value={formMod.nombres}
                    onChange={e => setFormMod({ ...formMod, nombres: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Apellido Paterno:</label>
                  <input value={formMod.apellido_paterno}
                    onChange={e => setFormMod({ ...formMod, apellido_paterno: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Ap. Materno:</label>
                  <input value={formMod.apellido_materno}
                    onChange={e => setFormMod({ ...formMod, apellido_materno: e.target.value })}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Edad:</label>
                  <input type="number" value={formMod.edad}
                    onChange={e => setFormMod({ ...formMod, edad: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Sexo:</label>
                  <select value={formMod.sexo}
                    onChange={e => setFormMod({ ...formMod, sexo: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Puesto:</label>
                  <select value={formMod.puesto}
                    onChange={e => setFormMod({ ...formMod, puesto: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
                    <option value="">Seleccionar</option>
                    {PUESTOS.map(p => <option key={p} value={p}>{PUESTOS_LABEL[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Usuario:</label>
                  <input value={formMod.usuario}
                    onChange={e => setFormMod({ ...formMod, usuario: e.target.value })}
                    required autoComplete="off"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">
                    Contraseña: <span className="font-normal text-gray-500">(vacío = no cambiar)</span>
                  </label>
                  <div className="relative">
                    <input type={showPasswordMod ? 'text' : 'password'}
                      value={formMod.password}
                      onChange={e => setFormMod({ ...formMod, password: e.target.value })}
                      placeholder="••••••••" autoComplete="new-password"
                      className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 pr-10 text-black" />
                    <button type="button" onClick={() => setShowPasswordMod(!showPasswordMod)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                      {showPasswordMod ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">
                    Nueva Fotografía: <span className="font-normal text-gray-500">(opcional)</span>
                  </label>
                  {selectedPersonal.foto_url && (
                    <img src={fotoSrc(selectedPersonal.foto_url)!}
                      alt="foto actual" className="w-10 h-10 rounded-full object-cover mb-1" />
                  )}
                  <input type="file" accept="image/*"
                    onChange={e => setFotoMod(e.target.files?.[0] || null)}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loadingMod}
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] disabled:opacity-60">
                  {loadingMod ? 'Guardando...' : 'Guardar'}
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

      <h2 className="text-xl font-bold text-black mb-1">Gestión de Personal</h2>
      <hr className="border-gray-300 mb-4" />

      {/* ── FORMULARIO AGREGAR ─────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-3">Agregar Nuevo Empleado</p>
      <form className="space-y-3 mb-6" onSubmit={handleAgregar} autoComplete="off">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombres:</label>
            <input value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
              required autoComplete="off"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Apellido Paterno:</label>
            <input value={form.apellido_paterno} onChange={e => setForm({ ...form, apellido_paterno: e.target.value })}
              required autoComplete="off"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Apellido Materno:</label>
            <input value={form.apellido_materno} onChange={e => setForm({ ...form, apellido_materno: e.target.value })}
              autoComplete="off"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Edad:</label>
            <input type="number" value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })}
              required min={16} max={99}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Sexo:</label>
            <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}
              required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Puesto:</label>
            <select value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })}
              required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
              <option value="">Seleccionar</option>
              {PUESTOS.map(p => <option key={p} value={p}>{PUESTOS_LABEL[p]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Usuario:</label>
            <input value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })}
              required autoComplete="off"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Contraseña:</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="new-password"
                className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 pr-10 text-black" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Fotografía:</label>
            <input id="foto-agregar" type="file" accept="image/*"
              onChange={e => setFoto(e.target.files?.[0] || null)}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black text-sm" />
          </div>
        </div>

        <button type="submit" disabled={loadingAgregar}
          className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 mt-1">
          {loadingAgregar ? 'Agregando...' : 'Agregar Nuevo Empleado'}
        </button>
      </form>

      {/* ── BUSCAR Y TABLA ─────────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-2">Buscar y Administrar Personal</p>
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Buscar por nombre o usuario..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-sm bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm" />
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando personal...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-[#d9d9d9]">
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">ID</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Foto</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Nombre Completo</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Puesto</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-left">Usuario</th>
                <th className="border border-gray-400 px-3 py-2 text-black font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-400">
                    {personal.length === 0 ? 'No hay personal registrado' : 'Sin resultados'}
                  </td>
                </tr>
              ) : (
                filtrado.map(p => (
                  <tr key={p.id_personal} className="bg-white">
                    <td className="border border-gray-400 px-3 py-2 text-black">{p.id_personal}</td>
                    <td className="border border-gray-400 px-3 py-2">
                      {fotoSrc(p.foto_url) ? (
                        <img src={fotoSrc(p.foto_url)!} alt={p.nombres}
                          className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#ea580c] flex items-center justify-center text-white font-bold text-sm">
                          {p.nombres.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-black font-bold">
                      {p.nombres} {p.apellido_paterno}{p.apellido_materno ? ` ${p.apellido_materno}` : ''}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{PUESTOS_LABEL[p.puesto]}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{p.usuario}</td>
                    <td className="border border-gray-400 px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirModificar(p)}
                          className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a]">
                          Modificar
                        </button>
                        <button onClick={() => setConfirmEliminar(p)}
                          className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-700">
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
  )
}