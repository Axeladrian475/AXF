import { useState } from 'react'

const MOCK_ACCESOS = [
  { id: 1, suscriptor: 'Carlos Velez (21500001)', dia: 'Martes', fecha: '04/11/2025', hora: '10:30 a. m.', metodo: 'Huella Digital' },
  { id: 2, suscriptor: 'Laura Mendiola (21500002)', dia: 'Martes', fecha: '04/11/2025', hora: '11:05 a. m.', metodo: 'NFC' },
]

export default function TabHistorialAcceso() {
  const [fecha, setFecha] = useState('')
  const [mostrado, setMostrado] = useState(false)

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Historial de Acceso de Suscriptores</h2>
      <hr className="border-gray-300 mb-4" />

      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="bg-white border border-gray-400 rounded px-3 py-2 text-black text-sm"
        />
        <button
          onClick={() => setMostrado(true)}
          className="bg-[#ea580c] text-white font-bold px-5 py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm"
        >
          Mostrar Historial Por Dia
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
              <th className="border border-gray-400 px-3 py-2 text-[#ea580c] font-bold text-left">Método de Acceso</th>
            </tr>
          </thead>
          <tbody>
            {(mostrado ? MOCK_ACCESOS : []).map(a => (
              <tr key={a.id} className="bg-white">
                <td className="border border-gray-400 px-3 py-2 text-black">{a.suscriptor}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.dia}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.fecha}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.hora}</td>
                <td className="border border-gray-400 px-3 py-2 text-black">{a.metodo}</td>
              </tr>
            ))}
            {(!mostrado || MOCK_ACCESOS.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-400">
                  {mostrado ? 'Sin registros para esta fecha' : 'Selecciona una fecha y presiona el botón'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
