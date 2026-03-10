import { useState, useEffect } from 'react'
import {
  getPromociones,
  crearPromocion,
  modificarPromocion,
  eliminarPromocion,
  type Promocion,
  type PromocionFormData,
} from '../../../api/promocionesApi'

const FORM_VACIO: PromocionFormData = {
  nombre: '',
  descripcion: '',
  duracion_dias: '',
  precio: '',
  sesiones_nutriologo: '',
  sesiones_entrenador: '',
}

export default function TabPromociones() {
  // ── Datos ──────────────────────────────────────────────────────────────────
  const [promos, setPromos] = useState<Promocion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Formulario Agregar ─────────────────────────────────────────────────────
  const [form, setForm] = useState<PromocionFormData>(FORM_VACIO)
  const [loadingGuardar, setLoadingGuardar] = useState(false)

  // ── Modal Modificar ────────────────────────────────────────────────────────
  const [selectedPromo, setSelectedPromo] = useState<Promocion | null>(null)
  const [formMod, setFormMod] = useState<PromocionFormData>(FORM_VACIO)
  const [loadingMod, setLoadingMod] = useState(false)

  // ── Confirmar eliminación ──────────────────────────────────────────────────
  const [confirmEliminar, setConfirmEliminar] = useState<Promocion | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => { cargarPromos() }, [])

  const cargarPromos = async () => {
    setLoading(true)
    try {
      setPromos(await getPromociones())
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar promociones')
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
      await crearPromocion(form)
      setForm(FORM_VACIO)
      mostrarExito('Promoción creada correctamente')
      await cargarPromos()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear promoción')
    } finally {
      setLoadingGuardar(false)
    }
  }

  // ── Modificar ──────────────────────────────────────────────────────────────
  const abrirModificar = (p: Promocion) => {
    setSelectedPromo(p)
    setFormMod({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      duracion_dias: p.duracion_dias,
      precio: p.precio,
      sesiones_nutriologo: p.sesiones_nutriologo,
      sesiones_entrenador: p.sesiones_entrenador,
    })
  }

  const handleModificar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPromo) return
    setLoadingMod(true)
    setError(null)
    try {
      await modificarPromocion(selectedPromo.id_promocion, formMod)
      mostrarExito('Promoción actualizada correctamente')
      setSelectedPromo(null)
      await cargarPromos()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al actualizar promoción')
    } finally {
      setLoadingMod(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!confirmEliminar) return
    try {
      await eliminarPromocion(confirmEliminar.id_promocion)
      mostrarExito('Promoción eliminada correctamente')
      setConfirmEliminar(null)
      await cargarPromos()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al eliminar promoción')
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
            <h3 className="text-lg font-bold text-black mb-2">¿Eliminar promoción?</h3>
            <p className="text-gray-600 text-sm mb-5">
              La promoción <span className="font-bold text-black">{confirmEliminar.nombre}</span> será
              eliminada permanentemente.
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
      {selectedPromo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">Modificar: {selectedPromo.nombre}</h3>
            <form className="space-y-3" onSubmit={handleModificar}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold italic mb-1">Nombre Promoción:</label>
                  <input value={formMod.nombre}
                    onChange={e => setFormMod({ ...formMod, nombre: e.target.value })}
                    required className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Días Adicionales:</label>
                  <input type="number" value={formMod.duracion_dias}
                    onChange={e => setFormMod({ ...formMod, duracion_dias: e.target.value })}
                    min={0}
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
                  <input type="number" value={formMod.sesiones_nutriologo}
                    onChange={e => setFormMod({ ...formMod, sesiones_nutriologo: e.target.value })}
                    min={0}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
                <div>
                  <label className="block text-sm font-bold italic mb-1">Sesiones entrenador:</label>
                  <input type="number" value={formMod.sesiones_entrenador}
                    onChange={e => setFormMod({ ...formMod, sesiones_entrenador: e.target.value })}
                    min={0}
                    className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold italic mb-1">Descripción:</label>
                <input value={formMod.descripcion}
                  onChange={e => setFormMod({ ...formMod, descripcion: e.target.value })}
                  placeholder="Descripción opcional de la promoción"
                  className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loadingMod}
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] disabled:opacity-60">
                  {loadingMod ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setSelectedPromo(null)}
                  className="bg-gray-300 text-black font-bold px-6 py-2 rounded hover:bg-gray-400">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-black mb-1">Gestión de promociones</h2>
      <hr className="border-gray-300 mb-4" />

      {/* ── FORMULARIO AGREGAR ─────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-3">Crear Nueva Promoción</p>
      <form className="space-y-3 mb-6" onSubmit={handleGuardar}>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Nombre Promoción:</label>
            <input value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              required
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Duración (Días Adicionales):</label>
            <input type="number" value={form.duracion_dias}
              onChange={e => setForm({ ...form, duracion_dias: e.target.value })}
              min={0}
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
            <input type="number" value={form.sesiones_nutriologo}
              onChange={e => setForm({ ...form, sesiones_nutriologo: e.target.value })}
              min={0}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black italic mb-1">Límite de sesiones de entrenador:</label>
            <input type="number" value={form.sesiones_entrenador}
              onChange={e => setForm({ ...form, sesiones_entrenador: e.target.value })}
              min={0}
              className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
          </div>
          <div>
            <button type="submit" disabled={loadingGuardar}
              className="w-full bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60">
              {loadingGuardar ? 'Guardando...' : 'Guardar Promoción'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-black italic mb-1">Descripción:</label>
          <input value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Descripción opcional de la promoción"
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black" />
        </div>
      </form>

      {/* ── TABLA ──────────────────────────────────────────────────────────── */}
      <p className="text-sm font-bold text-black mb-2">Promociones Registradas</p>
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando promociones...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-[#d9d9d9]">
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Nombre</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Duración (Días Adicionales)</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Precio</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones nutriólogo</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Sesiones entrenador</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Descripción</th>
                <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500 border border-gray-400">
                    No hay promociones registradas
                  </td>
                </tr>
              ) : (
                promos.map(p => (
                  <tr key={p.id_promocion} className="bg-white">
                    <td className="border border-gray-400 px-3 py-2 text-black font-semibold">{p.nombre}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{p.duracion_dias}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">
                      ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{p.sesiones_nutriologo}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black">{p.sesiones_entrenador}</td>
                    <td className="border border-gray-400 px-3 py-2 text-black text-xs text-gray-600 max-w-[180px] truncate">
                      {p.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                    </td>
                    <td className="border border-gray-400 px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirModificar(p)}
                          className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded hover:bg-[#c94a0a]">
                          Modificar
                        </button>
                        <button onClick={() => setConfirmEliminar(p)}
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