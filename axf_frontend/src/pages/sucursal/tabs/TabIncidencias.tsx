export default function TabIncidencias() {
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">
        Acceso y Configuración del Módulo Análisis de Incidencias
      </h2>
      <hr className="border-gray-300 mb-4" />

      <p className="text-sm text-black mb-4">
        Aquí se visualizarán los informes automatizados generados por el sistema sobre los reportes de los suscriptores.
      </p>

      <p className="text-sm font-bold text-black mb-3">Configuración de Frecuencia de Reportes</p>
      <form className="space-y-3" onSubmit={e => e.preventDefault()}>
        <div className="max-w-xs">
          <label className="block text-sm font-bold text-black italic mb-1">Deseo recibir los reportes:</label>
          <select className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black">
            <option value="">Seleccionar</option>
            <option value="dias">Cada X días</option>
            <option value="semanas">Cada X semanas</option>
            <option value="meses">Cada X meses</option>
          </select>
        </div>

        <div className="max-w-xs">
          <label className="block text-sm font-bold text-black italic mb-1">Valor:</label>
          <input
            type="number"
            min="1"
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
          />
        </div>

        <button
          type="submit"
          className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors"
        >
          Guardar Configuración
        </button>
      </form>
    </div>
  )
}
