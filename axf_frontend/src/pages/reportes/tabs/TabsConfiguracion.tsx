export default function TabsConfiguracion() {
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Configuración de Tiempos (SLA)</h2>
      <hr className="border-gray-300 mb-5" />

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xs space-y-4">
        <div>
          <label className="block text-sm font-bold text-black mb-1">Tiempo Strike 1 (Horas)</label>
          <input type="number" defaultValue={24}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-1">Tiempo Strike 2 (Horas)</label>
          <input type="number" defaultValue={48}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold text-black mb-1">Tiempo Strike 3 (Horas)</label>
          <input type="number" defaultValue={72}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm" />
        </div>
        <button className="bg-[#1e293b] text-white font-bold px-6 py-2 rounded hover:bg-[#0f172a] transition-colors text-sm">
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}
