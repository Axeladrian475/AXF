// ============================================================================
//  pages/reportes/Reportes.tsx
// ============================================================================

import { useState, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import TabsBuscarReportes    from './tabs/TabsBuscarReportes'
import TabsConfiguracion     from './tabs/TabsConfiguracion'
import TabsReportesPersonal  from './tabs/TabsReportesPersonal'

type Tab = 'buscar' | 'personal' | 'config'

export default function Reportes() {
  const { user } = useContext(AuthContext)
  const esMaestro  = user?.rol === 'maestro'
  const esSucursal = user?.rol === 'sucursal'

  const [tab, setTab] = useState<Tab>(esSucursal ? 'personal' : 'buscar')

  const btnClass = (t: Tab) =>
    `px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${
      tab === t
        ? t === 'personal'
          ? 'bg-red-700 text-white border-red-700'
          : 'bg-[#ea580c] text-white border-[#ea580c]'
        : 'bg-white text-black border-black hover:bg-gray-100'
    }`

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-6">

          {/* Tab de Reportes de Personal — solo sucursal */}
          {esSucursal && (
            <button onClick={() => setTab('personal')} className={btnClass('personal')}>
              🚨 Reportes de Personal
            </button>
          )}

          <button onClick={() => setTab('buscar')} className={btnClass('buscar')}>
            Todos los Reportes
          </button>

          {esMaestro && (
            <button onClick={() => setTab('config')} className={btnClass('config')}>
              Configuración
            </button>
          )}
        </div>

        {tab === 'personal' && esSucursal && <TabsReportesPersonal />}
        {tab === 'buscar'   && <TabsBuscarReportes />}
        {tab === 'config'   && esMaestro && <TabsConfiguracion />}

      </div>
    </div>
  )
}