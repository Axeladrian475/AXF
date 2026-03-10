import { useState } from 'react'

const MOCK_RECOMPENSAS = [
  { id: 1, nombre: 'Botella de Agua (AxF Pro)', puntos: 500 },
  { id: 2, nombre: 'Mes Gratis',                 puntos: 2000 },
  { id: 3, nombre: 'Playera AxF',                puntos: 1500 },
]

export default function Recompensas() {
  const [busqueda, setBusqueda] = useState('')
  const [puntosSuscriptor, setPuntosSuscriptor] = useState('')
  const [confirmCanje, setConfirmCanje] = useState<typeof MOCK_RECOMPENSAS[0] | null>(null)

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-black mb-1">Reclamar Recompensas</h2>
        <p className="text-sm text-gray-500 mb-4">Canje de puntos del suscriptor (Requiere verificación Huella/NFC)</p>
        <hr className="border-gray-300 mb-5" />

        {/* Buscar suscriptor */}
        <div className="mb-5">
          <p className="text-sm font-bold text-black mb-2">Identificar Suscriptor:</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm">
              <input type="text" placeholder="Buscar por nombre o ID..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-black" />
            </div>
            <button className="flex items-center gap-2 border-2 border-gray-400 text-black font-bold text-sm px-4 py-2 rounded hover:bg-gray-100">
              <span>👆</span> Verificar Huella
            </button>
            <button className="flex items-center gap-2 border-2 border-gray-400 text-black font-bold text-sm px-4 py-2 rounded hover:bg-gray-100">
              <span>💳</span> Leer NFC
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm font-bold text-black">Puntos disponibles del suscriptor:</label>
            <input type="number" value={puntosSuscriptor} onChange={e => setPuntosSuscriptor(e.target.value)}
              placeholder="0"
              className="w-28 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-black" />
          </div>
        </div>

        {/* Lista recompensas */}
        <p className="text-sm font-bold text-black mb-3">Recompensas Disponibles:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#fecaca]">
                <th className="border border-gray-300 px-3 py-2 text-black font-bold text-left">Recompensa</th>
                <th className="border border-gray-300 px-3 py-2 text-black font-bold text-left">Costo en Puntos</th>
                <th className="border border-gray-300 px-3 py-2 text-black font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECOMPENSAS.map(r => (
                <tr key={r.id} className="bg-white">
                  <td className="border border-gray-300 px-3 py-2 text-black">{r.nombre}</td>
                  <td className="border border-gray-300 px-3 py-2 text-black font-bold">{r.puntos}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <button onClick={() => setConfirmCanje(r)}
                      className="bg-[#ea580c] text-white text-xs font-bold px-4 py-1 rounded hover:bg-[#c94a0a]">
                      Canjear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal confirmar canje */}
        {confirmCanje && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
              <p className="text-4xl mb-3">🏆</p>
              <h3 className="font-bold text-black text-lg mb-2">Confirmar Canje</h3>
              <p className="text-sm text-gray-600 mb-1">Recompensa: <span className="font-bold text-black">{confirmCanje.nombre}</span></p>
              <p className="text-sm text-gray-600 mb-5">Costo: <span className="font-bold text-[#ea580c]">{confirmCanje.puntos} puntos</span></p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmCanje(null)}
                  className="bg-gray-200 text-black font-bold px-6 py-2 rounded hover:bg-gray-300">Cancelar</button>
                <button onClick={() => { alert('Canje realizado con éxito'); setConfirmCanje(null) }}
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a]">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
