// ============================================================================
//  pages/sucursal/tabs/TabHistorialAcceso.tsx
//  Historial de accesos — conectado a GET /api/dashboard/accesos?fecha=
// ============================================================================

import { useState, useEffect } from 'react'
import { RefreshCw }            from 'lucide-react'
import axiosClient              from '../../../api/axiosClient'

interface AccesoRow {
  id_acceso?:    number
  suscriptor:    string
  dia:           string
  fecha:         string
  hora:          string
  metodo:        'NFC' | 'Huella'
  resultado?:    string
}

function BadgeMetodo({ metodo }: { metodo: string }) {
  const isNFC = metodo === 'NFC'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
      ${isNFC ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-purple-100 text-purple-700 border border-purple-300'}`}>
      {isNFC ? '💳 NFC' : '👆 Huella'}
    </span>
  )
}

export default function TabHistorialAcceso() {
  const [fecha,    setFecha]    = useState('')
  const [accesos,  setAccesos]  = useState<AccesoRow[]>([])
  const [cargando, setCargando] = useState(false)
  const [buscado,  setBuscado]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const cargarHistorial = async () => {
    if (!fecha) return
    setCargando(true); setError(null); setBuscado(true)
    try {
      const { data } = await axiosClient.get(`/dashboard/accesos?fecha=${fecha}`)
      setAccesos(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al cargar el historial.')
      setAccesos([])
    } finally { setCargando(false) }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Historial de Acceso de Suscriptores</h2>
      <hr className="border-gray-300 mb-4" />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-400 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="flex items-center gap-3 mb-6">
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm" />
        <button onClick={cargarHistorial} disabled={cargando || !fecha}
          className="bg-[#ea580c] text-white font-bold px-5 py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm disabled:opacity-60 flex items-center gap-2">
          {cargando ? <><RefreshCw size={14} className="animate-spin" /> Cargando…</> : 'Mostrar Historial Por Día'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-white">
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Suscriptor</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Día</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Fecha</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Hora</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Método</th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((a, i) => (
              <tr key={`${a.id_acceso ?? i}`} className="bg-white">
                <td className="border border-gray-400 px-3 py-2 text-black">{a.suscriptor}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.dia}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.fecha}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.hora}</td>
                <td className="border border-gray-400 px-3 py-2"><BadgeMetodo metodo={a.metodo} /></td>
              </tr>
            ))}
            {buscado && !cargando && accesos.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-400">Sin registros para esta fecha</td></tr>
            )}
            {!buscado && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-400">Selecciona una fecha y presiona el botón</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
