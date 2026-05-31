import { useState } from 'react'
import TabPersonal              from './tabs/TabPersonal'
import TabSuscripciones         from './tabs/TabSuscripciones'
import TabPromociones           from './tabs/TabPromociones'
import TabIncidencias           from './tabs/TabIncidencias'
import TabAvisos                from './tabs/TabAvisos'
import TabRecompensas           from './tabs/TabRecompensas'
import TabHistorialAcceso       from './tabs/TabHistorialAcceso'
import TabsReportesPersonal     from '../reportes/tabs/TabsReportesPersonal'
import TabsReportesPrioritarios from '../reportes/tabs/TabsReportesPrioritarios'

type Tab =
  | 'personal'
  | 'suscripciones'
  | 'promociones'
  | 'incidencias'
  | 'avisos'
  | 'recompensas'
  | 'historial'
  | 'reportes_personal'
  | 'prioritarios'

const TABS: { id: Tab; label: string; urgente?: boolean }[] = [
  { id: 'personal',          label: 'Gestión de personal' },
  { id: 'suscripciones',     label: 'Gestión de suscripciones' },
  { id: 'promociones',       label: 'Gestión de promociones' },
  { id: 'incidencias',       label: 'Análisis de incidencias' },
  { id: 'avisos',            label: 'Enviar avisos' },
  { id: 'recompensas',       label: 'Config. de recompensas' },
  { id: 'historial',         label: 'Historial de acceso' },
  { id: 'reportes_personal', label: 'Reportes de Personal', urgente: true },
  { id: 'prioritarios',      label: 'Reportes Prioritarios', urgente: true },
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
                  ? tab.id === 'prioritarios'
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-red-600'
                    : tab.urgente
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-[#ea580c] text-white border-[#ea580c]'
                  : tab.id === 'prioritarios'
                    ? 'bg-orange-100 text-orange-700 border-orange-400 hover:bg-orange-200'
                    : tab.urgente
                      ? 'bg-red-100 text-red-700 border-red-400 hover:bg-red-200'
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
        {activeTab === 'personal'          && <TabPersonal />}
        {activeTab === 'suscripciones'     && <TabSuscripciones />}
        {activeTab === 'promociones'       && <TabPromociones />}
        {activeTab === 'incidencias'       && <TabIncidencias />}
        {activeTab === 'avisos'            && <TabAvisos />}
        {activeTab === 'recompensas'       && <TabRecompensas />}
        {activeTab === 'historial'         && <TabHistorialAcceso />}
        {activeTab === 'reportes_personal' && <TabsReportesPersonal />}
        {activeTab === 'prioritarios'       && <TabsReportesPrioritarios />}
      </div>
    </div>
  )
}
