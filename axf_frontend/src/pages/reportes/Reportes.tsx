import { useState } from 'react'
import TabsBuscarReportes from './tabs/TabsBuscarReportes'
import TabsConfiguracion from './tabs/TabsConfiguracion'

type Tab = 'buscar' | 'config'

export default function Reportes() {
  const [tab, setTab] = useState<Tab>('buscar')

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        {/* TABS */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('buscar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'buscar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Buscar Reportes
          </button>
          <button onClick={() => setTab('config')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'config' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Configuración
          </button>
        </div>

        {tab === 'buscar' && <TabsBuscarReportes />}
        {tab === 'config' && <TabsConfiguracion />}
      </div>
    </div>
  )
}
