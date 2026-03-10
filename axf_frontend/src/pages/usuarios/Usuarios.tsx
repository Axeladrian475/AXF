import { useState } from 'react'
import TabsDirectorioDeUsuarios from './tabs/TabsDirectorioDeUsuarios'
import TabsRegistrarNuevo from './tabs/TabsRegistrarNuevo'

type Tab = 'directorio' | 'registrar'

export default function Usuarios() {
  const [tab, setTab] = useState<Tab>('directorio')

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('directorio')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'directorio' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Directorio de Usuarios
          </button>
          <button onClick={() => setTab('registrar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'registrar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Registrar Nuevo
          </button>
        </div>

        {tab === 'directorio' && <TabsDirectorioDeUsuarios />}
        {tab === 'registrar'  && <TabsRegistrarNuevo />}
      </div>
    </div>
  )
}
