import { useState } from 'react'
import TabPersonal from './tabs/TabPersonal'
import TabSuscripciones from './tabs/TabSuscripciones'
import TabPromociones from './tabs/TabPromociones'
import TabIncidencias from './tabs/TabIncidencias'
import TabAvisos from './tabs/TabAvisos'
import TabRecompensas from './tabs/TabRecompensas'
import TabHistorialAcceso from './tabs/TabHistorialAcceso'

type Tab =
  | 'personal'
  | 'suscripciones'
  | 'promociones'
  | 'incidencias'
  | 'avisos'
  | 'recompensas'
  | 'historial'

const TABS: { id: Tab; label: string }[] = [
  { id: 'personal',      label: 'Gestion de personal' },
  { id: 'suscripciones', label: 'Gestion de suscripciones' },
  { id: 'promociones',   label: 'Gestion de promociones' },
  { id: 'incidencias',   label: 'Analisis de incidencias' },
  { id: 'avisos',        label: 'Enviar avisos' },
  { id: 'recompensas',   label: 'Configuracion de recompensas' },
  { id: 'historial',     label: 'Historial de acceso' },
]

export default function Sucursal() {
  const [activeTab, setActiveTab] = useState<Tab>('personal')

  return (
    <div className="p-4">
      {/* BARRA DE TABS */}
      <div className="bg-[#1e293b] px-6 py-3 rounded-t-lg">
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-all border-2 ${
                activeTab === tab.id
                  ? 'bg-[#ea580c] text-white border-[#ea580c]'
                  : 'bg-white text-black border-black hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="bg-[#f5f5f5] rounded-b-lg border-x-[3px] border-b-[3px] border-[#ea580c] p-6">
        {activeTab === 'personal'      && <TabPersonal />}
        {activeTab === 'suscripciones' && <TabSuscripciones />}
        {activeTab === 'promociones'   && <TabPromociones />}
        {activeTab === 'incidencias'   && <TabIncidencias />}
        {activeTab === 'avisos'        && <TabAvisos />}
        {activeTab === 'recompensas'   && <TabRecompensas />}
        {activeTab === 'historial'     && <TabHistorialAcceso />}
      </div>
    </div>
  )
}
