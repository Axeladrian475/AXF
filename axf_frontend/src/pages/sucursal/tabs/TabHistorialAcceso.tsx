// ============================================================================
//  pages/sucursal/tabs/TabHistorialAcceso.tsx
//  Historial de accesos de la sucursal por día — conectado al API real.
// ============================================================================

import { useState } from 'react'
import axiosClient from '../../../api/axiosClient'

interface Acceso {
  suscriptor:      string
  id_suscriptor:   number
  dia:             string
  fecha:           string
  hora:            string
  metodo:          string
  resultado:       string
  tipo_movimiento: 'Entrada' | 'Salida' | null
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-gray-200 border-t-[#ea580c] rounded-full animate-spin" />
  )
}

export default function TabHistorialAcceso() {
  const [fecha,    setFecha]    = useState('')
  const [accesos,  setAccesos]  = useState<Acceso[]>([])
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')
  const [buscado,  setBuscado]  = useState(false)

  const buscar = async () => {
    if (!fecha) {
      setError('Selecciona una fecha antes de buscar.')
      return
    }
    setCargando(true)
    setError('')
    setBuscado(true)
    try {
      const { data } = await axiosClient.get<Acceso[]>('/dashboard/accesos', {
        params: { fecha },
      })
      setAccesos(data)
    } catch {
      setError('Error al obtener el historial. Intenta de nuevo.')
      setAccesos([])
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Historial de Acceso de Suscriptores</h2>
      <hr className="border-gray-300 mb-4" />

      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={fecha}
          onChange={e => { setFecha(e.target.value); setError('') }}
          className="bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm"
        />
        <button
          onClick={buscar}
          disabled={cargando}
          className="bg-[#ea580c] text-white font-bold px-5 py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {cargando && <Spinner />}
          Mostrar Historial Por Día
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-3">❌ {error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-white">
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Suscriptor</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Día</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Fecha</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Hora</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Método de Acceso</th>
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Movimiento</th>
            </tr>
          </thead>
          <tbody>
            {/* Cargando */}
            {cargando && (
              <tr>
                <td colSpan={6} className="text-center py-6 border border-gray-400">
                  <div className="flex justify-center"><Spinner /></div>
                </td>
              </tr>
            )}

            {/* Filas de datos */}
            {!cargando && accesos.map((a, i) => (
              <tr key={i} className="bg-white hover:bg-gray-50">
                <td className="border border-gray-400 px-3 py-2 text-black">{a.suscriptor}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.dia}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.fecha}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.hora}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.metodo}</td>
                <td className="border border-gray-400 px-3 py-2">
                  {a.tipo_movimiento === 'Entrada' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                      ↓ Entrada
                    </span>
                  )}
                  {a.tipo_movimiento === 'Salida' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                      ↑ Salida
                    </span>
                  )}
                  {!a.tipo_movimiento && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200">
                      Sin dato
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {/* Sin resultados */}
            {!cargando && buscado && accesos.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-400">
                  Sin registros para el {fecha.split('-').reverse().join('/')}
                </td>
              </tr>
            )}

            {/* Estado inicial */}
            {!cargando && !buscado && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-400">
                  Selecciona una fecha y presiona el botón
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
