import { useState } from 'react'
import { agregarReceta, getRecetas } from '../../../store/recetasStore'
import type { Receta, Ingrediente } from '../../../store/recetasStore'

interface Props { onBack: () => void }

const INGREDIENTES_BASE = [
  'Pechuga de Pollo', 'Arroz Blanco', 'Aceite de Oliva', 'Avena', 'Leche',
  'Huevo', 'Espinaca', 'Zanahoria', 'Brócoli', 'Tomate', 'Atún en Lata',
  'Proteína en Polvo', 'Plátano', 'Fresas', 'Miel', 'Lechuga', 'Tomate Cherry',
  'Polvo para Hornear', 'Limón', 'Pepino', 'Aguacate', 'Queso Cottage',
]

const UNIDADES = ['g', 'ml', 'pz', 'tz', 'cdas', 'cdita']

export default function CargarReceta({ onBack }: Props) {
  const [nombre, setNombre]       = useState('')
  const [kcal, setKcal]           = useState('')
  const [proteinas, setProteinas] = useState('')
  const [carbos, setCarbos]       = useState('')
  const [grasas, setGrasas]       = useState('')
  const [busIng, setBusIng]       = useState('')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [recetasGuardadas, setRecetasGuardadas] = useState<Receta[]>(getRecetas)
  const [exito, setExito]         = useState('')
  const [error, setError]         = useState('')

  const filtrados = INGREDIENTES_BASE.filter(i =>
    i.toLowerCase().includes(busIng.toLowerCase()) &&
    !ingredientes.find(x => x.nombre === i)
  )

  const agregarIngrediente = (nombreIng: string) => {
    setIngredientes(prev => [...prev, { nombre: nombreIng, cantidad: '100', unidad: 'g' }])
    setBusIng('')
  }

  const actualizarIngrediente = (idx: number, campo: keyof Ingrediente, val: string) =>
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, [campo]: val } : ing))

  const eliminarIngrediente = (idx: number) =>
    setIngredientes(prev => prev.filter((_, i) => i !== idx))

  const guardarReceta = () => {
    if (!nombre.trim()) { setError('El nombre de la receta es obligatorio.'); return }
    if (ingredientes.length === 0) { setError('Agrega al menos un ingrediente.'); return }
    setError('')
    const nueva = agregarReceta({
      nombre: nombre.trim(),
      kcal: parseInt(kcal) || 0,
      proteinas: parseInt(proteinas) || 0,
      carbos: parseInt(carbos) || 0,
      grasas: parseInt(grasas) || 0,
      ingredientes,
    })
    setRecetasGuardadas(getRecetas())
    setExito(`Receta "${nueva.nombre}" guardada. Ya aparece disponible en Crear Dieta.`)
    setTimeout(() => setExito(''), 4000)
    setNombre(''); setKcal(''); setProteinas(''); setCarbos(''); setGrasas('')
    setIngredientes([])
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
              <label className="block text-xs font-bold text-black mb-1">Imagen (opcional)</label>
              <input type="file" accept="image/*"
                className="w-full text-xs text-black file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-xs file:font-bold" />
            </div>

            {/* Ingredientes */}
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
                        <button key={i} onClick={() => agregarIngrediente(i)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-black border-b border-gray-50 last:border-0">
                          {i}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => busIng.trim() && agregarIngrediente(busIng.trim())}
                  className="bg-[#1e293b] text-white font-bold w-9 h-9 rounded flex items-center justify-center text-xl hover:bg-[#0f172a] shrink-0">+</button>
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
                <p className="text-xs text-gray-400 italic py-1">Busca y agrega ingredientes</p>
              )}
            </div>

            {/* Valores nutricionales */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-black mb-2">Valores Nutricionales</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Kcal',       val: kcal,      set: setKcal },
                  { label: 'Proteínas',  val: proteinas, set: setProteinas },
                  { label: 'Carbos',     val: carbos,    set: setCarbos },
                  { label: 'Grasas',     val: grasas,    set: setGrasas },
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

            <button onClick={guardarReceta}
              className="w-full bg-[#ea580c] text-white font-bold py-2.5 rounded hover:bg-[#c94a0a] transition-colors text-sm">
              Guardar Receta
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
                <div key={r.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#ea580c] transition-colors">
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="font-bold text-sm text-black">{r.nombre}</p>
                    <span className="text-xs font-black text-[#ea580c] shrink-0 ml-2">{r.kcal} Kcal</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span>Prot: <strong className="text-black">{r.proteinas}g</strong></span>
                    <span>Carbs: <strong className="text-black">{r.carbos}g</strong></span>
                    <span>Grasas: <strong className="text-black">{r.grasas}g</strong></span>
                  </div>
                  <div className="space-y-0.5">
                    {r.ingredientes.map((ing, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        • {ing.nombre}: <span className="font-bold text-black">{ing.cantidad} {ing.unidad}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
