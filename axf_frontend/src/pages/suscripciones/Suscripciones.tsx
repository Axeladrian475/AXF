import { useState } from 'react'
import TabsBuscarSuscriptor from './tabs/TabsBuscarSuscriptor'
import TabsAdministrarSuscripcion from './tabs/TabsAdministrarSuscripcion'

type Tab = 'buscar' | 'administrar'

export default function Suscripciones() {
  const [tab, setTab] = useState<Tab>('buscar')
  const [suscriptorActivo, setSuscriptorActivo] = useState<{ id: string; nombre: string } | null>(null)

  const handleGestionar = (id: string, nombre: string) => {
    setSuscriptorActivo({ id, nombre })
    setTab('administrar')
  }

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('buscar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'buscar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Buscar Suscriptor
          </button>
          <button onClick={() => setTab('administrar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'administrar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Administrar Suscripción
          </button>
        </div>

        {tab === 'buscar' && <TabsBuscarSuscriptor onGestionar={handleGestionar} />}
        {tab === 'administrar' && suscriptorActivo && (
          <TabsAdministrarSuscripcion
            suscriptorId={suscriptorActivo.id}
            suscriptorNombre={suscriptorActivo.nombre}
          />
        )}
        {tab === 'administrar' && !suscriptorActivo && (
          <div className="text-center py-8 text-gray-500">
            <p className="font-bold">Selecciona un suscriptor desde "Buscar Suscriptor"</p>
          </div>
        )}
      </div>
    </div>
  )
}
