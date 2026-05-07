import { useState, useEffect, useMemo } from 'react'
import {
  getIngredientes,
  getRecetas as fetchRecetas,
  crearReceta,
  eliminarReceta,
  actualizarReceta,
} from '../../../api/nutricionApi'
import type { RecetaAPI } from '../../../api/nutricionApi'

interface Props { onBack: () => void }

const UNIDADES = ['g', 'ml', 'pz', 'tz', 'cdas', 'cdita']

interface IngredienteDB {
  id_ingrediente: number
  nombre: string
  unidad_medicion: string
}

interface IngredienteLocal {
  id_ingrediente: number
  nombre: string
  cantidad: string
  unidad: string
}

type Modo = 'nueva' | 'editar'

const emptyForm = () => ({ nombre: '', kcal: '', proteinas: '', grasas: '' })

export default function CargarReceta({ onBack }: Props) {
  const [form, setForm]                         = useState(emptyForm())
  const [ingredientes, setIngredientes]         = useState<IngredienteLocal[]>([])
  const [recetasGuardadas, setRecetasGuardadas] = useState<RecetaAPI[]>([])
  const [ingredientesDB, setIngredientesDB]     = useState<IngredienteDB[]>([])
  const [busIng, setBusIng]                     = useState('')
  const [busReceta, setBusReceta]               = useState('')
  const [exito, setExito]                       = useState('')
  const [error, setError]                       = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [cargando, setCargando]                 = useState(true)
  const [modo, setModo]                         = useState<Modo>('nueva')
  const [editandoId, setEditandoId]             = useState<number | null>(null)
  const [confirmarBorrar, setConfirmarBorrar]   = useState<number | null>(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [ings, recs] = await Promise.all([getIngredientes(), fetchRecetas()])
        setIngredientesDB(ings)
        setRecetasGuardadas(recs)
      } catch { /* silencio */ }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  const filtrados = useMemo(() =>
    ingredientesDB.filter(i =>
      i.nombre.toLowerCase().includes(busIng.toLowerCase()) &&
      !ingredientes.find(x => x.id_ingrediente === i.id_ingrediente)
    ), [busIng, ingredientesDB, ingredientes])

  const recetasFiltradas = useMemo(() =>
    recetasGuardadas.filter(r =>
      r.nombre.toLowerCase().includes(busReceta.toLowerCase())
    ), [busReceta, recetasGuardadas])

  const agregarIngrediente = (ing: IngredienteDB) => {
    setIngredientes(prev => [...prev, {
      id_ingrediente: ing.id_ingrediente,
      nombre: ing.nombre,
      cantidad: '100',
      unidad: ing.unidad_medicion,
    }])
    setBusIng('')
  }

  const actualizarIng = (idx: number, campo: 'cantidad' | 'unidad', val: string) =>
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, [campo]: val } : ing))

  const eliminarIng = (idx: number) =>
    setIngredientes(prev => prev.filter((_, i) => i !== idx))

  const resetForm = () => {
    setForm(emptyForm())
    setIngredientes([])
    setBusIng('')
    setModo('nueva')
    setEditandoId(null)
    setError('')
  }

  const cargarParaEditar = (r: RecetaAPI) => {
    setModo('editar')
    setEditandoId(r.id_receta)
    setForm({
      nombre: r.nombre,
      kcal: r.calorias != null ? String(r.calorias) : '',
      proteinas: r.proteinas_g != null ? String(r.proteinas_g) : '',
      grasas: r.grasas_g != null ? String(r.grasas_g) : '',
    })
    const ingsLocales: IngredienteLocal[] = r.ingredientes?.map(ing => {
      const match = ingredientesDB.find(
        db => db.nombre.toLowerCase() === ing.nombre.toLowerCase()
      )
      return {
        id_ingrediente: match?.id_ingrediente ?? 0,
        nombre: ing.nombre,
        cantidad: String(ing.cantidad),
        unidad: ing.unidad_medicion,
      }
    }) ?? []
    setIngredientes(ingsLocales)
    setBusIng('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre de la receta es obligatorio.'); return }
    if (ingredientes.length === 0) { setError('Agrega al menos un ingrediente.'); return }
    const ingsInvalidos = ingredientes.filter(i => i.id_ingrediente === 0)
    if (ingsInvalidos.length > 0) {
      setError(`Ingrediente(s) no reconocido(s): ${ingsInvalidos.map(i => i.nombre).join(', ')}. Elimínalos y vuelve a agregarlos desde el buscador.`)
      return
    }
    setError('')
    setGuardando(true)

    const payload = {
      nombre: form.nombre.trim(),
      calorias: form.kcal || undefined,
      proteinas_g: form.proteinas || undefined,
      grasas_g: form.grasas || undefined,
      ingredientes: ingredientes.map(i => ({
        id_ingrediente: i.id_ingrediente,
        cantidad: parseFloat(i.cantidad) || 0,
      })),
    }

    try {
      if (modo === 'editar' && editandoId !== null) {
        await actualizarReceta(editandoId, payload)
        setExito(`Receta "${form.nombre.trim()}" actualizada correctamente.`)
      } else {
        await crearReceta(payload)
        setExito(`Receta "${form.nombre.trim()}" guardada. Ya aparece disponible en Crear Dieta.`)
      }
      const recs = await fetchRecetas()
      setRecetasGuardadas(recs)
      setTimeout(() => setExito(''), 4000)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar receta')
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async (id: number) => {
    try {
      await eliminarReceta(id)
      setRecetasGuardadas(prev => prev.filter(r => r.id_receta !== id))
      if (editandoId === id) resetForm()
    } catch {
      setError('No se pudo eliminar la receta.')
    } finally {
      setConfirmarBorrar(null)
    }
  }

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">

        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-gray-500 hover:text-black transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Cargar Receta</h2>
        </div>

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {exito}
          </div>
        )}

        {cargando ? (
          <p className="text-center text-gray-400 py-10">Cargando datos...</p>
        ) : (
          <div className="grid grid-cols-2 gap-5">

            {/* ── Formulario ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-black text-base">
                  {modo === 'editar' ? 'Editar Receta' : 'Nueva Receta'}
                </h3>
                {modo === 'editar' && (
                  <button
                    onClick={resetForm}
                    className="text-xs text-gray-500 hover:text-black border border-gray-300 rounded px-2 py-1 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar edición
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="block text-xs font-bold text-black mb-1">Nombre de la Receta *</label>
                <input
                  placeholder="Ej. Pollo con Arroz"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-black mb-1">Ingredientes *</label>

                <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <input
                      placeholder="Buscar ingrediente..."
                      value={busIng}
                      onChange={e => setBusIng(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-black text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {filtrados.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-400 italic">
                        {ingredientesDB.length === 0 ? 'No hay ingredientes en la base de datos' : 'Sin coincidencias'}
                      </p>
                    ) : (
                      filtrados.map(i => (
                        <button
                          key={i.id_ingrediente}
                          onClick={() => agregarIngrediente(i)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-black border-b border-gray-50 last:border-0 flex justify-between items-center group"
                        >
                          <span className="font-bold">{i.nombre}</span>
                          <span className="text-gray-400 text-xs group-hover:text-[#ea580c]">+ {i.unidad_medicion}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {ingredientes.length > 0 ? (
                  <div className="space-y-1.5">
                    {ingredientes.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                        <span className="text-xs font-bold text-black flex-1 truncate">{ing.nombre}</span>
                        <input
                          value={ing.cantidad}
                          onChange={e => actualizarIng(idx, 'cantidad', e.target.value)}
                          className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs text-center text-black bg-white"
                        />
                        <select
                          value={ing.unidad}
                          onChange={e => actualizarIng(idx, 'unidad', e.target.value)}
                          className="border border-gray-300 rounded px-1 py-0.5 text-xs text-black bg-white"
                        >
                          {UNIDADES.map(u => <option key={u}>{u}</option>)}
                        </select>
                        <button
                          onClick={() => eliminarIng(idx)}
                          className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded px-2 py-0.5 transition-all whitespace-nowrap"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-1">Selecciona ingredientes de la lista de arriba</p>
                )}
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-black mb-2">Valores Nutricionales</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Kcal',          key: 'kcal'      as const },
                    { label: 'Proteínas (g)', key: 'proteinas' as const },
                    { label: 'Grasas (g)',    key: 'grasas'    as const },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-black text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-xs mb-3 font-bold bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={guardar}
                disabled={guardando}
                className={`w-full font-bold py-2.5 rounded transition-colors text-sm disabled:opacity-50 text-white ${
                  modo === 'editar'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-[#ea580c] hover:bg-[#c94a0a]'
                }`}
              >
                {guardando
                  ? (modo === 'editar' ? 'Actualizando...' : 'Guardando...')
                  : (modo === 'editar' ? 'Guardar Cambios' : 'Guardar Receta')}
              </button>
            </div>

            {/* ── Lista de Recetas ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-black text-base mb-1">
                Recetas
                <span className="ml-2 text-[#ea580c] font-black">({recetasGuardadas.length})</span>
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Al arrastrarlas en Crear Dieta, sus ingredientes se escribirán automáticamente.
              </p>

              <input
                placeholder="Buscar receta..."
                value={busReceta}
                onChange={e => setBusReceta(e.target.value)}
                className="w-full mb-3 bg-white border border-gray-200 rounded px-3 py-1.5 text-black text-sm focus:outline-none focus:border-[#ea580c]"
              />

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {recetasFiltradas.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2 text-center">Sin resultados</p>
                )}
                {recetasFiltradas.map(r => (
                  <div
                    key={r.id_receta}
                    className={`border rounded-lg p-3 transition-colors ${
                      editandoId === r.id_receta
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-[#ea580c]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-black leading-tight">{r.nombre}</p>
                      <span className="text-xs font-black text-[#ea580c] shrink-0 ml-2">
                        {r.calorias ?? 0} Kcal
                      </span>
                    </div>

                    <div className="flex gap-3 text-xs text-gray-500 mb-2">
                      <span>Prot: <strong className="text-black">{r.proteinas_g ?? 0}g</strong></span>
                      <span>Grasas: <strong className="text-black">{r.grasas_g ?? 0}g</strong></span>
                      <span className="text-gray-400">{r.ingredientes?.length ?? 0} ingrediente(s)</span>
                    </div>

                    <div className="space-y-0.5 mb-3">
                      {r.ingredientes?.map((ing, i) => (
                        <p key={i} className="text-xs text-gray-500">
                          • {ing.nombre}: <span className="font-bold text-black">{ing.cantidad} {ing.unidad_medicion}</span>
                        </p>
                      ))}
                    </div>

                    {confirmarBorrar === r.id_receta ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-xs text-red-700 font-bold flex-1">¿Eliminar esta receta?</p>
                        <button
                          onClick={() => confirmarEliminar(r.id_receta)}
                          className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded px-3 py-1 transition-colors"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setConfirmarBorrar(null)}
                          className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 rounded px-3 py-1 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cargarParaEditar(r)}
                          disabled={editandoId === r.id_receta}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-300 hover:border-blue-600 rounded px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-default"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {editandoId === r.id_receta ? 'Editando...' : 'Editar receta'}
                        </button>

                        <button
                          onClick={() => setConfirmarBorrar(r.id_receta)}
                          className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded px-3 py-1.5 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar receta
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}