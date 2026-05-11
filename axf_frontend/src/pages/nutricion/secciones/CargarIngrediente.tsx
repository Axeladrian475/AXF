import { useState, useEffect } from 'react'
import { getIngredientes, crearIngrediente, actualizarIngrediente, eliminarIngrediente } from '../../../api/nutricionApi'
import type { IngredienteAPI } from '../../../api/nutricionApi'

interface Props { onBack: () => void }

// Unidades con sus etiquetas legibles y cantidad base sugerida
const UNIDADES: { value: string; label: string; base: number; hint: string }[] = [
  { value: 'g',     label: 'Gramos (g)',          base: 100, hint: 'Macros por cada 100 g'           },
  { value: 'ml',    label: 'Mililitros (ml)',      base: 100, hint: 'Macros por cada 100 ml'          },
  { value: 'pz',    label: 'Pieza (pz)',           base: 1,   hint: 'Macros por 1 pieza'              },
  { value: 'tz',    label: 'Taza (tz)',            base: 1,   hint: 'Macros por 1 taza'               },
  { value: 'cdas',  label: 'Cucharada (cdas)',     base: 1,   hint: 'Macros por 1 cucharada'          },
  { value: 'cdita', label: 'Cucharadita (cdita)',  base: 1,   hint: 'Macros por 1 cucharadita'        },
]

const soloLetras = (val: string) => val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '')

const emptyForm = (unidad = 'g') => ({
  nombre:             '',
  unidad_medicion:    unidad,
  cantidad_base:      UNIDADES.find(u => u.value === unidad)?.base ?? 100,
  kcal_base:          0,
  proteinas_base:     0,
  grasas_base:        0,
  carbohidratos_base: 0,
})

export default function CargarIngrediente({ onBack }: Props) {
  const [form, setForm]           = useState(emptyForm())
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [error, setError]         = useState('')
  const [lista, setLista]         = useState<IngredienteAPI[]>([])
  const [cargando, setCargando]   = useState(true)

  // Modal edición
  const [editando, setEditando]           = useState<IngredienteAPI | null>(null)
  const [editForm, setEditForm]           = useState(emptyForm())
  const [editGuardando, setEditGuardando] = useState(false)
  const [editError, setEditError]         = useState('')

  const cargar = async () => {
    try {
      setCargando(true)
      setLista(await getIngredientes())
    } catch { /* silencio */ }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  // Al cambiar unidad actualiza la cantidad base sugerida
  const handleUnidadChange = (val: string) => {
    const base = UNIDADES.find(u => u.value === val)?.base ?? 100
    setForm(f => ({ ...f, unidad_medicion: val, cantidad_base: base }))
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setError(''); setGuardando(true)
    try {
      await crearIngrediente({
        nombre:             form.nombre.trim(),
        unidad_medicion:    form.unidad_medicion,
        cantidad_base:      Number(form.cantidad_base),
        kcal_base:          Number(form.kcal_base),
        proteinas_base:     Number(form.proteinas_base),
        grasas_base:        Number(form.grasas_base),
        carbohidratos_base: Number(form.carbohidratos_base),
      })
      setExito(`Ingrediente "${form.nombre.trim()}" agregado.`)
      setTimeout(() => setExito(''), 4000)
      setForm(emptyForm())
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar ingrediente')
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: number) => {
    if (!confirm('¿Eliminar este ingrediente? También se quitará de las recetas donde fue usado.')) return
    try {
      await eliminarIngrediente(id)
      setLista(prev => prev.filter(i => i.id_ingrediente !== id))
      setExito('Ingrediente eliminado.'); setTimeout(() => setExito(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar')
      setTimeout(() => setError(''), 4000)
    }
  }

  const abrirEditar = (ing: IngredienteAPI) => {
    setEditando(ing)
    setEditForm({
      nombre:             ing.nombre,
      unidad_medicion:    ing.unidad_medicion,
      cantidad_base:      ing.cantidad_base,
      kcal_base:          ing.kcal_base,
      proteinas_base:     ing.proteinas_base,
      grasas_base:        ing.grasas_base,
      carbohidratos_base: ing.carbohidratos_base,
    })
    setEditError('')
  }

  const guardarEdicion = async () => {
    if (!editando) return
    if (!editForm.nombre.trim()) { setEditError('El nombre es obligatorio'); return }
    setEditError(''); setEditGuardando(true)
    try {
      const resp = await actualizarIngrediente(editando.id_ingrediente, {
        nombre:             editForm.nombre.trim(),
        unidad_medicion:    editForm.unidad_medicion,
        cantidad_base:      Number(editForm.cantidad_base),
        kcal_base:          Number(editForm.kcal_base),
        proteinas_base:     Number(editForm.proteinas_base),
        grasas_base:        Number(editForm.grasas_base),
        carbohidratos_base: Number(editForm.carbohidratos_base),
      })
      const n = resp.recetas_recalculadas ?? 0
      setExito(`Ingrediente actualizado.${n > 0 ? ` Se recalcularon ${n} receta(s).` : ''}`)
      setTimeout(() => setExito(''), 5000)
      setEditando(null); cargar()
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Error al actualizar')
    } finally {
      setEditGuardando(false)
    }
  }

  const hintUnidad = (u: string) => UNIDADES.find(x => x.value === u)?.hint ?? ''

  const MacroInput = ({
    label, value, onChange,
  }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="number" min="0" step="0.1"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0"
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-black text-center focus:outline-none focus:border-[#ea580c]"
      />
    </div>
  )

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Cargar Ingrediente</h2>
        </div>

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg">
            ✅ {exito}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-800 text-sm font-bold px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {/* ── Formulario nuevo ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-black text-base mb-0.5">Nuevo Ingrediente</h3>
            <p className="text-xs text-gray-500 mb-4">
              Ingrese los valores nutricionales por la unidad base seleccionada.
            </p>

            {/* Nombre */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-black mb-1">Nombre del Ingrediente</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: soloLetras(e.target.value) }))}
                placeholder="Ej. Pechuga de Pollo"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Solo letras y espacios.</p>
            </div>

            {/* Unidad de medida */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-black mb-1">Unidad de Medida</label>
              <select
                value={form.unidad_medicion}
                onChange={e => handleUnidadChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm"
              >
                {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            {/* Cantidad base */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-black mb-1">
                Cantidad de referencia
                <span className="ml-1 text-gray-400 font-normal">({form.unidad_medicion})</span>
              </label>
              <input
                type="number" min="0.01" step="any"
                value={form.cantidad_base || ''}
                onChange={e => setForm(f => ({ ...f, cantidad_base: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-[#ea580c]"
              />
              <p className="text-[10px] text-[#ea580c] font-bold mt-1">{hintUnidad(form.unidad_medicion)}</p>
            </div>

            {/* Macros */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-bold text-orange-800 mb-2">
                📊 Valores nutricionales por {form.cantidad_base} {form.unidad_medicion}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MacroInput label="Kcal" value={form.kcal_base}
                  onChange={v => setForm(f => ({ ...f, kcal_base: v }))} />
                <MacroInput label="Proteínas (g)" value={form.proteinas_base}
                  onChange={v => setForm(f => ({ ...f, proteinas_base: v }))} />
                <MacroInput label="Grasas (g)" value={form.grasas_base}
                  onChange={v => setForm(f => ({ ...f, grasas_base: v }))} />
                <MacroInput label="Carbohidratos (g)" value={form.carbohidratos_base}
                  onChange={v => setForm(f => ({ ...f, carbohidratos_base: v }))} />
              </div>
            </div>

            <button
              onClick={guardar} disabled={guardando}
              className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Agregar Ingrediente'}
            </button>
          </div>

          {/* ── Lista existentes ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-black text-base mb-0.5">
              Ingredientes disponibles
              <span className="ml-2 text-[#ea580c] font-black">({lista.length})</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">Disponibles para uso en recetas.</p>

            {cargando ? (
              <p className="text-xs text-gray-400 py-4 text-center">Cargando...</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {lista.map(ing => (
                  <div key={ing.id_ingrediente}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-bold text-black truncate">{ing.nombre}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                          {ing.unidad_medicion}
                        </span>
                      </div>
                      <div className="flex gap-1.5 ml-2 shrink-0">
                        <button onClick={() => abrirEditar(ing)}
                          className="bg-[#1e293b] text-white text-xs font-bold px-2.5 py-1 rounded hover:bg-[#0f172a] transition-colors">
                          ✏️
                        </button>
                        <button onClick={() => borrar(ing.id_ingrediente)}
                          className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded hover:bg-red-600 transition-colors">
                          🗑
                        </button>
                      </div>
                    </div>
                    {/* Mini tabla de macros */}
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: 'Kcal',    value: ing.kcal_base },
                        { label: 'Prot',    value: ing.proteinas_base },
                        { label: 'Grasas',  value: ing.grasas_base },
                        { label: 'Carbs',   value: ing.carbohidratos_base },
                      ].map(m => (
                        <div key={m.label} className="bg-white border border-gray-100 rounded px-1 py-0.5">
                          <p className="text-[9px] text-gray-400 uppercase">{m.label}</p>
                          <p className="text-xs font-black text-black">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                      por {ing.cantidad_base} {ing.unidad_medicion}
                    </p>
                  </div>
                ))}
                {lista.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No hay ingredientes registrados</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Editar ── */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !editGuardando) setEditando(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-black">Editar Ingrediente</h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-black text-xl font-bold">✕</button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Nombre</label>
                <input
                  value={editForm.nombre}
                  onChange={e => setEditForm(f => ({ ...f, nombre: soloLetras(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Unidad</label>
                  <select
                    value={editForm.unidad_medicion}
                    onChange={e => {
                      const base = UNIDADES.find(u => u.value === e.target.value)?.base ?? 100
                      setEditForm(f => ({ ...f, unidad_medicion: e.target.value, cantidad_base: base }))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black text-sm"
                  >
                    {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Cantidad base</label>
                  <input
                    type="number" min="0.01"
                    value={editForm.cantidad_base || ''}
                    onChange={e => setEditForm(f => ({ ...f, cantidad_base: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-bold text-orange-800 mb-2">
                  📊 Macros por {editForm.cantidad_base} {editForm.unidad_medicion}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Kcal',              key: 'kcal_base'          as const },
                    { label: 'Proteínas (g)',      key: 'proteinas_base'     as const },
                    { label: 'Grasas (g)',         key: 'grasas_base'        as const },
                    { label: 'Carbohidratos (g)',  key: 'carbohidratos_base' as const },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{f.label}</label>
                      <input
                        type="number" min="0" step="0.1"
                        value={editForm[f.key] || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-black text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {editError && <p className="text-red-500 text-xs font-bold mb-3">{editError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setEditando(null)} disabled={editGuardando}
                className="flex-1 border border-gray-300 text-black font-bold py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={editGuardando}
                className="flex-1 bg-[#ea580c] text-white font-bold py-2 rounded-lg text-sm hover:bg-[#c94a0a] disabled:opacity-50 flex items-center justify-center gap-2">
                {editGuardando
                  ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Guardando...</>
                  : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}