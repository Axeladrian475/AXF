// ============================================================================
//  pages/reportes/Reportes.tsx
// ============================================================================

import { useState, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import TabsBuscarReportes        from './tabs/TabsBuscarReportes'
import TabsConfiguracion         from './tabs/TabsConfiguracion'
import TabsReportesPersonal      from './tabs/TabsReportesPersonal'
import TabsReportesPrioritarios  from './tabs/TabsReportesPrioritarios'

type Tab = 'buscar' | 'personal' | 'config' | 'prioritarios'

export default function Reportes() {
  const { user } = useContext(AuthContext)
  const esMaestro  = user?.rol === 'maestro'
  const esSucursal = user?.rol === 'sucursal'

  const [tab, setTab] = useState<Tab>(esSucursal ? 'prioritarios' : 'buscar')

  const btnClass = (t: Tab) =>
    `px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${
      tab === t
        ? t === 'personal'
          ? 'bg-red-700 text-white border-red-700'
          : t === 'prioritarios'
            ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-red-600'
            : 'bg-[#ea580c] text-white border-[#ea580c]'
        : 'bg-white text-black border-black hover:bg-gray-100'
    }`

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-6">

          {/* Tab de Reportes Prioritarios — solo sucursal */}
          {esSucursal && (
            <button onClick={() => setTab('prioritarios')} className={btnClass('prioritarios')}>
              Reportes Prioritarios
            </button>
          )}

          {/* Tab de Reportes de Personal — solo sucursal */}
          {esSucursal && (
            <button onClick={() => setTab('personal')} className={btnClass('personal')}>
              Reportes de Personal
            </button>
          )}

          <button onClick={() => setTab('buscar')} className={btnClass('buscar')}>
            Todos los Reportes
          </button>

          {(esMaestro || esSucursal) && (
            <button onClick={() => setTab('config')} className={btnClass('config')}>
              Configuración
            </button>
          )}
        </div>

        {tab === 'prioritarios' && esSucursal && <TabsReportesPrioritarios />}
        {tab === 'personal'     && esSucursal && <TabsReportesPersonal />}
        {tab === 'buscar'       && <TabsBuscarReportes />}
        {tab === 'config'       && (esMaestro || esSucursal) && <TabsConfiguracion />}

      </div>
    </div>
  )
}
