import { useState, useMemo } from 'react'

interface Props { onBack: () => void }

const SUSCRIPTORES = [
  { id: 1, nombre: 'Laura Mendiola',       edad: 25, sexo: 'F' },
  { id: 2, nombre: 'Juan Perez',            edad: 32, sexo: 'M' },
  { id: 3, nombre: 'Ana García',            edad: 40, sexo: 'F' },
  { id: 4, nombre: 'Carlos Rivera',         edad: 28, sexo: 'M' },
  { id: 5, nombre: 'María Fernanda López',  edad: 22, sexo: 'F' },
]

const FACTORES_ACT = [
  { val: '1.2',   label: 'Sedentario',                 prot: [0.8, 1.0] },
  { val: '1.375', label: 'Ligeramente Activo',          prot: [1.0, 1.2] },
  { val: '1.55',  label: 'Moderadamente Activo',        prot: [1.2, 1.5] },
  { val: '1.725', label: 'Muy Activo',                  prot: [1.5, 2.0] },
  { val: '1.9',   label: 'Extremadamente Activo',       prot: [2.0, 2.5] },
]

const OBJETIVOS = [
  { val:  '0',    label: 'Mantenimiento' },
  { val: '-0.15', label: 'Pérdida de Grasa (-15%)' },
  { val: '-0.20', label: 'Pérdida Agresiva (-20%)' },
  { val:  '0.10', label: 'Ganancia Muscular (+10%)' },
  { val:  '0.15', label: 'Volumen (+15%)' },
]

const HISTORIAL_MOCK = [
  { fecha: '2025-11-01', peso: '76.0', cals: '1,650 / 2,400', nutriologo: 'Nutrióloga actual' },
  { fecha: '2025-10-15', peso: '75.5', cals: '1,600 / 2,300', nutriologo: 'Nutriólogo A' },
  { fecha: '2025-09-01', peso: '78.0', cals: '1,550 / 2,200', nutriologo: 'Nutrióloga B' },
]

export default function RegistroUsuarios({ onBack }: Props) {
  const [busqueda, setBusqueda]       = useState('')
  const [paciente, setPaciente]       = useState<typeof SUSCRIPTORES[0] | null>(null)
  const [peso, setPeso]               = useState('')
  const [altura, setAltura]           = useState('')
  const [grasa, setGrasa]             = useState('')
  const [musculo, setMusculo]         = useState('')
  const [actividad, setActividad]     = useState('1.55')
  const [objetivo, setObjetivo]       = useState('0')
  const [notas, setNotas]             = useState('')
  const [calculado, setCalculado]     = useState(false)

  const filtrados = useMemo(() =>
    SUSCRIPTORES.filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [busqueda]
  )

  // Fórmula Mifflin-St Jeor diferenciada por sexo
  const calculos = useMemo(() => {
    if (!paciente || !peso || !altura) return null
    const p = parseFloat(peso), h = parseFloat(altura)
    const tmb = paciente.sexo === 'M'
      ? (10 * p) + (6.25 * h) - (5 * paciente.edad) + 5
      : (10 * p) + (6.25 * h) - (5 * paciente.edad) - 161
    const factAct  = parseFloat(actividad)
    const factObj  = parseFloat(objetivo)
    const tdee = factObj === 0 ? tmb * factAct : tmb * factAct * (1 + factObj)
    const protFactor = FACTORES_ACT.find(f => f.val === actividad)?.prot ?? [1.2, 1.5]
    const protMin = Math.round(p * protFactor[0])
    const protMax = Math.round(p * protFactor[1])
    const carbMin = Math.round((tdee * 0.40) / 4)
    const carbMax = Math.round((tdee * 0.50) / 4)
    const grasaMin = Math.round((tdee * 0.20) / 9)
    const grasaMax = Math.round((tdee * 0.30) / 9)
    return {
      tmb: Math.round(tmb),
      tdee: Math.round(tdee),
      proteinas: `${protMin} - ${protMax}`,
      carbos: `${carbMin} - ${carbMax}`,
      grasas: `${grasaMin} - ${grasaMax}`,
    }
  }, [paciente, peso, altura, actividad, objetivo])

  const seleccionar = (s: typeof SUSCRIPTORES[0]) => {
    setPaciente(s)
    setCalculado(false)
    setPeso(''); setAltura(''); setGrasa(''); setMusculo('')
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-gray-500 hover:text-black transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-black">Registros Usuarios</h2>
        </div>

        <div className="flex gap-4">
          {/* Panel búsqueda suscriptores */}
          <div className="w-56 shrink-0">
            <h3 className="text-sm font-bold text-black mb-2">🔍 Buscar Suscriptor Activo</h3>
            <input type="text" placeholder="Nombre / Apellido..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white mb-2" />
            <p className="text-xs text-gray-500 mb-1">Seleccione paciente (Suscripción Activa):</p>
            <ul className="border border-gray-200 rounded-lg overflow-hidden">
              {filtrados.map(s => (
                <li key={s.id}
                  onClick={() => seleccionar(s)}
                  className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-0 transition-colors
                    ${paciente?.id === s.id ? 'bg-[#ea580c] text-white font-bold' : 'text-black hover:bg-orange-50'}`}>
                  {s.nombre}
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className="px-3 py-2 text-xs text-gray-400">Sin resultados</li>
              )}
            </ul>
          </div>

          {/* Panel registro */}
          {!paciente ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Selecciona un suscriptor para registrar sus datos físicos
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-base text-black">
                Registrar Datos de: <span className="text-[#ea580c]">{paciente.nombre}</span>
              </h3>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Datos Físicos Actuales</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Peso (kg)</label>
                    <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Altura (cm)</label>
                    <input type="number" value={altura} onChange={e => setAltura(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Edad</label>
                    <input readOnly value={paciente.edad}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-black text-sm bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">% Grasa Corporal</label>
                    <input type="number" step="0.1" value={grasa} onChange={e => setGrasa(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">% Masa Muscular</label>
                    <input type="number" step="0.1" value={musculo} onChange={e => setMusculo(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Sexo</label>
                    <input readOnly value={paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-black text-sm bg-gray-100 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Actividad Física</label>
                    <select value={actividad} onChange={e => setActividad(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white">
                      {FACTORES_ACT.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Objetivo</label>
                    <select value={objetivo} onChange={e => setObjetivo(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white">
                      {OBJETIVOS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-black mb-1">Notas (Estado / Restricciones)</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                      placeholder="Ej: Intolerante a lactosa, lesión rodilla derecha..."
                      className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm bg-white resize-none" />
                  </div>
                </div>
              </div>

              {/* Botón calcular */}
              <button onClick={() => setCalculado(true)}
                className="w-full bg-[#1e293b] text-white font-bold py-2 rounded hover:bg-[#0f172a] transition-colors text-sm">
                🔎 Calcular Macronutrientes
              </button>

              {/* Resultados */}
              {calculado && calculos && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1e293b] rounded-lg p-4 col-span-2">
                    <h4 className="text-white text-xs font-bold mb-3 uppercase">Resultados Nutricionales</h4>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <p className="text-gray-300">TMB (Tasa Metabólica Basal): <span className="text-[#ea580c] font-black">{calculos.tmb} Kcal</span></p>
                      <p className="text-gray-300">TDEE (Gasto Energético Total): <span className="text-[#ea580c] font-black">{calculos.tdee} Kcal</span></p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Proteínas (g)',     val: calculos.proteinas },
                        { label: 'Carbohidratos (g)', val: calculos.carbos },
                        { label: 'Grasas (g)',        val: calculos.grasas },
                      ].map(m => (
                        <div key={m.label} className="bg-white/10 rounded-lg p-2 text-center">
                          <p className="text-gray-400 text-xs mb-1">{m.label}</p>
                          <p className="text-[#ea580c] font-black text-base">{m.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Acciones rápidas */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-black mb-3">Acciones Rápidas</h4>
                    <div className="space-y-2">
                      <button className="w-full bg-blue-600 text-white font-bold py-2 rounded text-sm hover:bg-blue-700">
                        Acceder a Crear Dieta
                      </button>
                      <button className="w-full border border-gray-400 text-black font-bold py-2 rounded text-sm hover:bg-gray-100">
                        🖨 Imprimir Registros Históricos
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end items-end">
                    <button className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700 transition-colors text-sm h-fit">
                      💾 Guardar Registro
                    </button>
                  </div>
                </div>
              )}

              {/* Historial */}
              {paciente && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">🗂 Historial de Registros</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {['Fecha','Peso (kg)','TMB / TDEE','Nutriólogo','Acción'].map(h => (
                            <th key={h} className="text-left font-bold text-black px-3 py-2 border border-gray-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HISTORIAL_MOCK.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 text-black">{r.fecha}</td>
                            <td className="px-3 py-2 text-black">{r.peso}</td>
                            <td className="px-3 py-2 text-black">{r.cals}</td>
                            <td className="px-3 py-2 text-black">{r.nutriologo}</td>
                            <td className="px-3 py-2">
                              <button className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded hover:bg-red-600">
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
