import { useState } from 'react'
interface Props { onBack: () => void }

const INGREDIENTES_MOCK = ['Pechuga de Pollo','Arroz Blanco','Aceite Oliva','Avena','Leche','Huevo','Espinaca','Zanahoria','Brócoli','Tomate']

interface Ingrediente { nombre: string; cantidad: string; unidad: string }

export default function CargarReceta({ onBack }: Props) {
  const [nombre, setNombre] = useState('')
  const [busIng, setBusIng] = useState('')
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { nombre: 'Pechuga de Pollo', cantidad: '200', unidad: 'g' },
    { nombre: 'Arroz Blanco',     cantidad: '150', unidad: 'g' },
    { nombre: 'Aceite Oliva',     cantidad: '10',  unidad: 'ml' },
  ])
  const [proteinas, setProteinas] = useState('')
  const [carbos, setCarbos] = useState('')
  const [grasas, setGrasas] = useState('')

  const filtrados = INGREDIENTES_MOCK.filter(i =>
    i.toLowerCase().includes(busIng.toLowerCase()) && !ingredientes.find(x => x.nombre === i)
  )

  const agregarIngrediente = (nombre: string) => {
    setIngredientes(prev => [...prev, { nombre, cantidad: '100', unidad: 'g' }])
    setBusIng('')
  }
  const eliminar = (idx: number) => setIngredientes(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Cargar Receta</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl mx-auto">
          <h3 className="font-bold text-black text-base mb-4">Nueva Receta</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-black mb-1">Nombre de la Receta</label>
              <input placeholder="Ej. Pollo con Arroz" value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-black mb-1">Imagen (URL o Archivo)</label>
              <input type="file" accept="image/*"
                className="w-full text-sm text-black file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:bg-gray-50 file:text-sm file:font-bold" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-black mb-1">Agregar Ingredientes</label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <input placeholder="Buscar ingrediente..." value={busIng} onChange={e => setBusIng(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
                {busIng && filtrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg z-10 max-h-32 overflow-y-auto">
                    {filtrados.map(i => (
                      <button key={i} onClick={() => agregarIngrediente(i)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-black">{i}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => busIng && agregarIngrediente(busIng)}
                className="bg-[#1e293b] text-white font-bold w-9 h-9 rounded flex items-center justify-center text-lg hover:bg-[#0f172a]">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ingredientes.map((ing, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-black text-xs px-2 py-1 rounded-full">
                  {ing.nombre} ({ing.cantidad}{ing.unidad})
                  <button onClick={() => eliminar(idx)} className="text-red-400 hover:text-red-600 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-bold text-black mb-2">Valores Nutricionales Totales (Calculados o Manuales)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Proteínas', val: proteinas, set: setProteinas },
                { label: 'Carbohidratos', val: carbos, set: setCarbos },
                { label: 'Grasas', val: grasas, set: setGrasas },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-black mb-1">{f.label}</label>
                  <div className="relative">
                    <input type="number" placeholder="g" value={f.val} onChange={e => f.set(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 pr-6 text-black text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors">
              Guardar Receta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
