import { useState, useEffect } from 'react'
import {
  getSuscripciones,
  crearSuscripcion,
  modificarSuscripcion,
  eliminarSuscripcion,
  type TipoSuscripcion,
  type TipoSuscripcionFormData,
} from '../../../api/suscripcionesApi'

const FORM_VACIO: TipoSuscripcionFormData = {
  nombre: '',
  duracion_dias: '',
  precio: '',
  limite_sesiones_nutriologo: '',
  limite_sesiones_entrenador: '',
}

export default function TabSuscripciones() {
  // ── Datos ──────────────────────────────────────────────────────────────────
  const [subs, setSubs] = useState<TipoSuscripcion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Formulario Agregar ─────────────────────────────────────────────────────
  const [form, setForm] = useState<TipoSuscripcionFormData>(FORM_VACIO)
  const [loadingGuardar, setLoadingGuardar] = useState(false)

  // ── Modal Modificar ────────────────────────────────────────────────────────
  const [selectedSub, setSelectedSub] = useState<TipoSuscripcion | null>(null)
  const [formMod, setFormMod] = useState<TipoSuscripcionFormData>(FORM_VACIO)
  const [loadingMod, setLoadingMod] = useState(false)

  // ── Confirmar eliminación ──────────────────────────────────────────────────
  const [confirmEliminar, setConfirmEliminar] = useState<TipoSuscripcion | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => { cargarSubs() }, [])

  const cargarSubs = async () => {
    setLoading(true)
    try {
      setSubs(await getSuscripciones())
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar suscripciones')
    } finally {
      setLoading(false)
    }
  }

  const mostrarExito = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // ── Agregar ────────────────────────────────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingGuardar(true)
    setError(null)
    try {
      await crearSuscripcion(form)
      setForm(FORM_VACIO)
      mostrarExito('Tipo de suscripción creado correctamente')
      await cargarSubs()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear suscripción')
    } finally {
      setLoadingGuardar(false)
    }
  }

  // ── Modificar ──────────────────────────────────────────────────────────────
  const abrirModificar = (s: TipoSuscripcion) => {
    setSelectedSub(s)
    setFormMod({
      nombre: s.nombre,
      duracion_dias: s.duracion_dias,
      precio: s.precio,
      limite_sesiones_nutriologo: s.limite_sesiones_nutriologo,
      limite_sesiones_entrenador: s.limite_sesiones_entrenador,
    })
  }

  const handleModificar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub) return
    setLoadingMod(true)
    setError(null)
    try {
      await modificarSuscripcion(selectedSub.id_tipo, formMod)
      mostrarExito('Tipo de suscripción actualizado correctamente')
      setSelectedSub(null)
      await cargarSubs()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar suscripción')
    } finally {
      setLoadingMod(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmEliminar) return
    try {
      await eliminarSuscripcion(confirmEliminar.id_tipo)
      mostrarExito('Tipo de suscripción eliminado correctamente')
      setConfirmEliminar(null)
      await cargarSubs()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al eliminar suscripción')
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
            <h3 className="text-lg font-bold text-black mb-2">¿Eliminar suscripción?</h3>
            <p className="text-gray-600 text-sm mb-5">
              El tipo <span className="font-bold text-black">{confirmEliminar.nombre}</span> será
              eliminado permanentemente.
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
      {selectedSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">Modificar: {selectedSub.nombre}</h3>
            <form className="space-y-3" onSubmit={handleModificar}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Nombre:</label>
                  <input value={formMod.nombre}
                    onChange={e => setFormMod({ ...formMod, nombre: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Duración (Días):</label>
                  <input type="number" value={formMod.duracion_dias}
                    onChange={e => setFormMod({ ...formMod, duracion_dias: e.target.value })}
                    required min={1}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Precio (MN):</label>
                  <input type="number" value={formMod.precio}
                    onChange={e => setFormMod({ ...formMod, precio: e.target.value })}
                    required min={0} step="0.01"
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Sesiones nutriólogo:</label>
                  <input type="number" value={formMod.limite_sesiones_nutriologo}
                    onChange={e => setFormMod({ ...formMod, limite_sesiones_nutriologo: e.target.value })}
                    min={0}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Sesiones entrenador:</label>
                  <input type="number" value={formMod.limite_sesiones_entrenador}
                    onChange={e => setFormMod({ ...formMod, limite_sesiones_entrenador: e.target.value })}
                    min={0}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loadingMod}
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] disabled:opacity-60">
                  {loadingMod ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setSelectedSub(null)}
                  className="bg-gray-300 text-black font-bold px-6 py-2 rounded hover:bg-gray-400">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-black mb-1">Gestión de tipos de suscripciones</h2>
      <hr className="border-gray-300 mb-4" />

      {/* ── FORMULARIO AGREGAR ─────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-3">Agregar Nuevo Tipo de suscripcion</p>
      <form className="space-y-3 mb-6" onSubmit={handleGuardar}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombres:</label>
            <input value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              required
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Duración (Dias):</label>
            <input type="number" value={form.duracion_dias}
              onChange={e => setForm({ ...form, duracion_dias: e.target.value })}
              required min={1}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Precio: (MN)</label>
            <input type="number" value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
              required min={0} step="0.01"
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Límite de sesiones de nutriólogo:</label>
            <input type="number" value={form.limite_sesiones_nutriologo}
              onChange={e => setForm({ ...form, limite_sesiones_nutriologo: e.target.value })}
              min={0}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Límite de sesiones de entrenador:</label>
            <input type="number" value={form.limite_sesiones_entrenador}
              onChange={e => setForm({ ...form, limite_sesiones_entrenador: e.target.value })}
              min={0}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <button type="submit" disabled={loadingGuardar}
              className="w-full bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60">
              {loadingGuardar ? 'Guardando...' : 'Guardar Suscripción'}
            </button>
          </div>
        </div>
      </form>

      {/* ── TABLA ──────────────────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-2">Suscripciones Registradas</p>
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando suscripciones...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-[#d9d9d9]">
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Nombre</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Duración</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Precio</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones nutriólogo</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones entrenador</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-400">
                    No hay tipos de suscripción registrados
                  </td>
                </tr>
              ) : (
                subs.map(s => (
                  <tr key={s.id_tipo} className="bg-white">
                    <td className="border border-gray-400 px-3 py-2 text-black">{s.nombre}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{s.duracion_dias}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">
                      ${Number(s.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{s.limite_sesiones_nutriologo}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{s.limite_sesiones_entrenador}</td>
                    <td className="border border-gray-400 px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirModificar(s)}
                          className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a]">
                          Modificar
                        </button>
                        <button onClick={() => setConfirmEliminar(s)}
                          className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-yellow-600">
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