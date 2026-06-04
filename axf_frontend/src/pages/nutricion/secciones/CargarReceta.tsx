import { useState, useEffect, useMemo } from 'react'
import {
  getIngredientes,
  getRecetas as fetchRecetas,
  crearReceta,
  eliminarReceta,
  actualizarReceta,
} from '../../../api/nutricionApi'
import type { RecetaAPI, IngredienteAPI } from '../../../api/nutricionApi'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://axfgymnet.com'

interface Props { onBack: () => void }

interface IngredienteLocal {
  id_ingrediente:    number
  nombre:            string
  cantidad:          string        // lo que escribe el usuario
  unidad_medicion:   string        // viene del ingrediente, NO editable
  // macros de la BD (por cantidad_base)
  cantidad_base:     number
  kcal_base:         number
  proteinas_base:    number
  grasas_base:       number
  carbohidratos_base: number
}

type Modo = 'nueva' | 'editar'

// Calcular macros de un ingrediente dado una cantidad
function macrosPara(ing: IngredienteLocal, cantidad: number) {
  const f = ing.cantidad_base > 0 ? cantidad / ing.cantidad_base : 0
  return {
    kcal:    Math.round(ing.kcal_base         * f * 100) / 100,
    prot:    Math.round(ing.proteinas_base    * f * 100) / 100,
    grasas:  Math.round(ing.grasas_base       * f * 100) / 100,
    carbs:   Math.round(ing.carbohidratos_base* f * 100) / 100,
  }
}

export default function CargarReceta({ onBack }: Props) {
  const [nombreReceta, setNombreReceta]         = useState('')
  const [imagenArchivo, setImagenArchivo]       = useState<File | null>(null)
  const [imagenPreview, setImagenPreview]       = useState<string | null>(null)
  const [ingredientes, setIngredientes]         = useState<IngredienteLocal[]>([])
  const [recetasGuardadas, setRecetasGuardadas] = useState<RecetaAPI[]>([])
  const [ingredientesDB, setIngredientesDB]     = useState<IngredienteAPI[]>([])
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

  // Ingredientes disponibles para agregar (no están ya en la receta)
  const filtrados = useMemo(() =>
    ingredientesDB.filter(i =>
      i.nombre.toLowerCase().includes(busIng.toLowerCase()) &&
      !ingredientes.find(x => x.id_ingrediente === i.id_ingrediente)
    ), [busIng, ingredientesDB, ingredientes])

  const recetasFiltradas = useMemo(() =>
    recetasGuardadas.filter(r =>
      r.nombre.toLowerCase().includes(busReceta.toLowerCase())
    ), [busReceta, recetasGuardadas])

  // Macros totales calculados en tiempo real
  const totales = useMemo(() => {
    let kcal = 0, prot = 0, grasas = 0, carbs = 0
    for (const ing of ingredientes) {
      const c = parseFloat(ing.cantidad) || 0
      const m = macrosPara(ing, c)
      kcal += m.kcal; prot += m.prot; grasas += m.grasas; carbs += m.carbs
    }
    return {
      kcal:   Math.round(kcal   * 100) / 100,
      prot:   Math.round(prot   * 100) / 100,
      grasas: Math.round(grasas * 100) / 100,
      carbs:  Math.round(carbs  * 100) / 100,
    }
  }, [ingredientes])

  const agregarIngrediente = (ing: IngredienteAPI) => {
    setIngredientes(prev => [...prev, {
      id_ingrediente:     ing.id_ingrediente,
      nombre:             ing.nombre,
      cantidad:           String(ing.cantidad_base), // cantidad base como default
      unidad_medicion:    ing.unidad_medicion,
      cantidad_base:      ing.cantidad_base,
      kcal_base:          ing.kcal_base,
      proteinas_base:     ing.proteinas_base,
      grasas_base:        ing.grasas_base,
      carbohidratos_base: ing.carbohidratos_base,
    }])
    setBusIng('')
  }

  const actualizarCantidad = (idx: number, val: string) =>
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, cantidad: val } : ing))

  const eliminarIng = (idx: number) =>
    setIngredientes(prev => prev.filter((_, i) => i !== idx))

  const resetForm = () => {
    setNombreReceta(''); setIngredientes([]); setImagenArchivo(null); setImagenPreview(null);
    setBusIng(''); setModo('nueva'); setEditandoId(null); setError('')
  }

  const cargarParaEditar = (r: RecetaAPI) => {
    setModo('editar'); setEditandoId(r.id_receta)
    setNombreReceta(r.nombre)
    setImagenArchivo(null)
    setImagenPreview(r.imagen_url ? `${API_BASE}${r.imagen_url}` : null)
    const ingsLocales: IngredienteLocal[] = r.ingredientes?.map(ing => {
      const db = ingredientesDB.find(d => d.id_ingrediente === ing.id_ingrediente)
      return {
        id_ingrediente:     ing.id_ingrediente,
        nombre:             ing.nombre,
        cantidad:           String(ing.cantidad),
        unidad_medicion:    ing.unidad_medicion,
        cantidad_base:      db?.cantidad_base      ?? ing.cantidad_base      ?? 100,
        kcal_base:          db?.kcal_base          ?? ing.kcal_base          ?? 0,
        proteinas_base:     db?.proteinas_base     ?? ing.proteinas_base     ?? 0,
        grasas_base:        db?.grasas_base        ?? ing.grasas_base        ?? 0,
        carbohidratos_base: db?.carbohidratos_base ?? ing.carbohidratos_base ?? 0,
      }
    }) ?? []
    setIngredientes(ingsLocales)
    setBusIng(''); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    if (!nombreReceta.trim())   { setError('El nombre de la receta es obligatorio.'); return }
    if (ingredientes.length === 0) { setError('Agrega al menos un ingrediente.'); return }
    const invalidos = ingredientes.filter(i => i.id_ingrediente === 0)
    if (invalidos.length > 0) {
      setError(`Ingrediente(s) no reconocido(s): ${invalidos.map(i => i.nombre).join(', ')}`)
      return
    }
    setError(''); setGuardando(true)

    const form = new FormData()
    form.append('nombre', nombreReceta.trim())
    form.append('ingredientes', JSON.stringify(ingredientes.map(i => ({
      id_ingrediente: i.id_ingrediente,
      cantidad: parseFloat(i.cantidad) || 0,
    }))))
    if (imagenArchivo) form.append('imagen', imagenArchivo)

    try {
      if (modo === 'editar' && editandoId !== null) {
        await actualizarReceta(editandoId, form as any)
        setExito(`Receta "${nombreReceta.trim()}" actualizada.`)
      } else {
        await crearReceta(form as any)
        setExito(`Receta "${nombreReceta.trim()}" guardada.`)
      }
      setRecetasGuardadas(await fetchRecetas())
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
                  <button onClick={resetForm}
                    className="text-xs text-gray-500 hover:text-black border border-gray-300 rounded px-2 py-1 transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar edición
                  </button>
                )}
              </div>

              {/* Nombre e Imagen */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Nombre de la Receta *</label>
                  <input
                    placeholder="Ej. Pollo con Arroz"
                    value={nombreReceta}
                    onChange={e => setNombreReceta(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Imagen (Opcional)</label>
                  <div className="flex items-center gap-2">
                    {imagenPreview && (
                      <img src={imagenPreview} alt="Preview" className="w-10 h-10 object-cover rounded border border-gray-300 shrink-0" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setImagenArchivo(file)
                          setImagenPreview(URL.createObjectURL(file))
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                  </div>
                </div>
              </div>

              {/* Ingredientes */}
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
                        {ingredientesDB.length === 0 ? 'No hay ingredientes en la BD' : 'Sin coincidencias'}
                      </p>
                    ) : (
                      filtrados.map(i => (
                        <button key={i.id_ingrediente} onClick={() => agregarIngrediente(i)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-black border-b border-gray-50 last:border-0 flex justify-between items-center group">
                          <span className="font-bold">{i.nombre}</span>
                          <span className="text-gray-400 text-xs group-hover:text-[#ea580c]">
                            + {i.unidad_medicion} · {i.kcal_base} kcal/{i.cantidad_base}{i.unidad_medicion}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {ingredientes.length > 0 ? (
                  <div className="space-y-1.5">
                    {ingredientes.map((ing, idx) => {
                      const c = parseFloat(ing.cantidad) || 0
                      const m = macrosPara(ing, c)
                      return (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold text-black flex-1 truncate">{ing.nombre}</span>
                            <input
                              value={ing.cantidad}
                              onChange={e => actualizarCantidad(idx, e.target.value)}
                              className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs text-center text-black bg-white"
                              type="number" min="0" step="any"
                            />
                            {/* Unidad — solo lectura, viene del ingrediente */}
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">
                              {ing.unidad_medicion}
                            </span>
                            <button onClick={() => eliminarIng(idx)}
                              className="text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded px-2 py-0.5 transition-all">
                              ✕
                            </button>
                          </div>
                          {/* Macros del ingrediente en tiempo real */}
                          {c > 0 && (
                            <div className="grid grid-cols-4 gap-1 text-center">
                              {[
                                { l: 'Kcal',   v: m.kcal   },
                                { l: 'Prot',   v: m.prot   },
                                { l: 'Grasas', v: m.grasas },
                                { l: 'Carbs',  v: m.carbs  },
                              ].map(x => (
                                <div key={x.l} className="bg-white rounded border border-gray-100 py-0.5">
                                  <p className="text-[8px] text-gray-400 uppercase">{x.l}</p>
                                  <p className="text-[10px] font-black text-black">{x.v}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-1">Selecciona ingredientes de la lista</p>
                )}
              </div>

              {/* Totales calculados automáticamente */}
              {ingredientes.length > 0 && (
                <div className="bg-[#1e293b] rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-2">
                    📊 Total receta (calculado automáticamente)
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Kcal',     value: totales.kcal,   color: 'text-orange-400' },
                      { label: 'Proteínas',value: totales.prot,   color: 'text-blue-300'   },
                      { label: 'Grasas',   value: totales.grasas, color: 'text-yellow-300' },
                      { label: 'Carbs',    value: totales.carbs,  color: 'text-green-300'  },
                    ].map(x => (
                      <div key={x.label}>
                        <p className={`text-lg font-black ${x.color}`}>{x.value}</p>
                        <p className="text-[10px] text-gray-400">{x.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-xs mb-3 font-bold bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button onClick={guardar} disabled={guardando}
                className={`w-full font-bold py-2.5 rounded transition-colors text-sm disabled:opacity-50 text-white ${
                  modo === 'editar' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#ea580c] hover:bg-[#c94a0a]'
                }`}>
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
                Los macros se calculan automáticamente al asignar cantidades a los ingredientes.
              </p>

              <input
                placeholder="Buscar receta..."
                value={busReceta}
                onChange={e => setBusReceta(e.target.value)}
                className="w-full mb-3 bg-white border border-gray-200 rounded px-3 py-1.5 text-black text-sm focus:outline-none focus:border-[#ea580c]"
              />

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {recetasFiltradas.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2 text-center">Sin resultados</p>
                )}
                {recetasFiltradas.map(r => (
                  <div key={r.id_receta}
                    className={`border rounded-lg p-3 transition-colors ${
                      editandoId === r.id_receta ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-[#ea580c]'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                        {r.imagen_url && (
                          <img src={`${API_BASE}${r.imagen_url}`} alt={r.nombre} className="w-10 h-10 object-cover rounded shadow-sm" />
                        )}
                        <p className="font-bold text-sm text-black leading-tight">{r.nombre}</p>
                      </div>
                      <span className="text-xs font-black text-[#ea580c] shrink-0 ml-2">
                        {r.calorias ?? 0} Kcal
                      </span>
                    </div>

                    {/* Macros de la receta */}
                    <div className="grid grid-cols-4 gap-1 text-center mb-2">
                      {[
                        { l: 'Proteínas', v: r.proteinas_g     ?? 0 },
                        { l: 'Grasas',    v: r.grasas_g        ?? 0 },
                        { l: 'Carbs',     v: r.carbohidratos_g ?? 0 },
                        { l: 'Ingred.',   v: r.ingredientes?.length ?? 0, unit: '' },
                      ].map(x => (
                        <div key={x.l} className="bg-gray-50 border border-gray-100 rounded py-0.5">
                          <p className="text-[8px] text-gray-400 uppercase">{x.l}</p>
                          <p className="text-xs font-black text-black">{x.v}{x.unit ?? 'g'}</p>
                        </div>
                      ))}
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
                        <button onClick={() => confirmarEliminar(r.id_receta)}
                          className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded px-3 py-1 transition-colors">
                          Sí, eliminar
                        </button>
                        <button onClick={() => setConfirmarBorrar(null)}
                          className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 rounded px-3 py-1 transition-colors">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => cargarParaEditar(r)} disabled={editandoId === r.id_receta}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-300 hover:border-blue-600 rounded px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-default">
                          {editandoId === r.id_receta ? 'Editando...' : '✏️ Editar receta'}
                        </button>
                        <button onClick={() => setConfirmarBorrar(r.id_receta)}
                          className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded px-3 py-1.5 transition-all">
                          🗑 Eliminar
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