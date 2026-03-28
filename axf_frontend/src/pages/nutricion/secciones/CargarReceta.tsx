import { useState, useEffect, useMemo } from 'react'
import { getIngredientes, getRecetas as fetchRecetas, crearReceta, eliminarReceta } from '../../../api/nutricionApi'
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

export default function CargarReceta({ onBack }: Props) {
  const [nombre, setNombre]       = useState('')
  const [kcal, setKcal]           = useState('')
  const [proteinas, setProteinas] = useState('')
  const [grasas, setGrasas]       = useState('')
  const [busIng, setBusIng]       = useState('')
  const [ingredientes, setIngredientes] = useState<IngredienteLocal[]>([])
  const [recetasGuardadas, setRecetasGuardadas] = useState<RecetaAPI[]>([])
  const [ingredientesDB, setIngredientesDB]     = useState<IngredienteDB[]>([])
  const [exito, setExito]   = useState('')
  const [error, setError]   = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando]   = useState(true)

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

  const agregarIngrediente = (ing: IngredienteDB) => {
    setIngredientes(prev => [...prev, {
      id_ingrediente: ing.id_ingrediente,
      nombre: ing.nombre,
      cantidad: '100',
      unidad: ing.unidad_medicion,
    }])
    setBusIng('')
  }

  const actualizarIngrediente = (idx: number, campo: 'cantidad' | 'unidad', val: string) =>
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, [campo]: val } : ing))

  const eliminarIngrediente = (idx: number) =>
    setIngredientes(prev => prev.filter((_, i) => i !== idx))

  const guardarReceta = async () => {
    if (!nombre.trim()) { setError('El nombre de la receta es obligatorio.'); return }
    if (ingredientes.length === 0) { setError('Agrega al menos un ingrediente.'); return }
    setError('')
    setGuardando(true)

    try {
      await crearReceta({
        nombre: nombre.trim(),
        calorias: kcal || undefined,
        proteinas_g: proteinas || undefined,
        grasas_g: grasas || undefined,
        ingredientes: ingredientes.map(i => ({ id_ingrediente: i.id_ingrediente, cantidad: parseFloat(i.cantidad) || 0 })),
      } as any)

      const recs = await fetchRecetas()
      setRecetasGuardadas(recs)

      setExito(`Receta "${nombre.trim()}" guardada. Ya aparece disponible en Crear Dieta.`)
      setTimeout(() => setExito(''), 4000)
      setNombre(''); setKcal(''); setProteinas(''); setGrasas('')
      setIngredientes([])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar receta')
    } finally {
      setGuardando(false)
    }
  }

  const borrarReceta = async (id: number) => {
    if (!confirm('¿Eliminar esta receta?')) return
    try {
      await eliminarReceta(id)
      setRecetasGuardadas(prev => prev.filter(r => r.id_receta !== id))
    } catch { /* silencio */ }
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
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg">
            ✅ {exito}
          </div>
        )}

        {cargando ? (
          <p className="text-center text-gray-400 py-10">Cargando datos...</p>
        ) : (
        <div className="grid grid-cols-2 gap-5">

          {/* Formulario */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-black text-base mb-4">Nueva Receta</h3>

            <div className="mb-3">
              <label className="block text-xs font-bold text-black mb-1">Nombre de la Receta *</label>
              <input placeholder="Ej. Pollo con Arroz" value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-black mb-1">Ingredientes *</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <input placeholder="Buscar ingrediente..." value={busIng}
                    onChange={e => setBusIng(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c]" />
                  {busIng && filtrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg z-10 max-h-36 overflow-y-auto">
                      {filtrados.map(i => (
                        <button key={i.id_ingrediente} onClick={() => agregarIngrediente(i)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-black border-b border-gray-50 last:border-0">
                          {i.nombre} <span className="text-gray-400 text-xs">({i.unidad_medicion})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {ingredientes.length > 0 ? (
                <div className="space-y-1.5">
                  {ingredientes.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                      <span className="text-xs font-bold text-black flex-1 truncate">{ing.nombre}</span>
                      <input value={ing.cantidad}
                        onChange={e => actualizarIngrediente(idx, 'cantidad', e.target.value)}
                        className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs text-center text-black bg-white" />
                      <select value={ing.unidad}
                        onChange={e => actualizarIngrediente(idx, 'unidad', e.target.value)}
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs text-black bg-white">
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <button onClick={() => eliminarIngrediente(idx)}
                        className="text-red-400 hover:text-red-600 font-bold text-sm ml-1">×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-1">Busca y agrega ingredientes de la base de datos</p>
              )}
            </div>

            {/* Valores nutricionales */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-black mb-2">Valores Nutricionales</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Kcal',       val: kcal,      set: setKcal },
                  { label: 'Proteínas (g)', val: proteinas, set: setProteinas },
                  { label: 'Grasas (g)',    val: grasas,    set: setGrasas },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input type="number" placeholder="0" value={f.val}
                      onChange={e => f.set(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-black text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mb-3 font-bold">{error}</p>}

            <button onClick={guardarReceta} disabled={guardando}
              className="w-full bg-[#ea580c] text-white font-bold py-2.5 rounded hover:bg-[#c94a0a] transition-colors text-sm disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar Receta'}
            </button>
          </div>

          {/* Lista guardadas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-black text-base mb-1">
              Recetas en Base de Datos
              <span className="ml-2 text-[#ea580c] font-black">({recetasGuardadas.length})</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Al arrastrarlas en Crear Dieta, sus ingredientes se escribirán automáticamente.
            </p>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {recetasGuardadas.map(r => (
                <div key={r.id_receta} className="border border-gray-200 rounded-lg p-3 hover:border-[#ea580c] transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="font-bold text-sm text-black">{r.nombre}</p>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-black text-[#ea580c]">{r.calorias ?? 0} Kcal</span>
                      <button onClick={() => borrarReceta(r.id_receta)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold">🗑</button>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span>Prot: <strong className="text-black">{r.proteinas_g ?? 0}g</strong></span>
                    <span>Grasas: <strong className="text-black">{r.grasas_g ?? 0}g</strong></span>
                  </div>
                  <div className="space-y-0.5">
                    {r.ingredientes?.map((ing, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        • {ing.nombre}: <span className="font-bold text-black">{ing.cantidad} {ing.unidad_medicion}</span>
                      </p>
                    ))}
                  </div>
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
