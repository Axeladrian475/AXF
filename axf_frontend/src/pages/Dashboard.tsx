import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const MOCK_ACCESOS = [
  { id: 1, suscriptor: 'Carlos Velez (21500001)', dia: 'Martes', fecha: '04/11/2025', hora: '10:30 a. m.', metodo: 'Huella Digital' },
  { id: 2, suscriptor: 'Laura Mendiola (21500002)', dia: 'Martes', fecha: '04/11/2025', hora: '11:05 a. m.', metodo: 'NFC' },
]

const ROL_LABEL: Record<string, string> = {
  // valores de puesto (personal)
  staff:                 'Staff',
  entrenador:            'Entrenador',
  nutriologo:            'Nutriólogo',
  entrenador_nutriologo: 'Entrenador/Nutriólogo',
  // roles directos
  personal:              'Staff',
  sucursal:              'Administrador Sucursal',
  maestro:               'Maestro',
}

const todos = ['staff','entrenador','nutriologo','entrenador_nutriologo'] ;
const entrenador = ['entrenador','entrenador_nutriologo'] ;
const nutriologo = ['nutriologo','entrenador_nutriologo'] ;

const MODULOS = [
  { id: 'usuarios',      emoji: '👤', titulo: 'Módulo de Usuarios',            desc: 'Registrar y Modificar Suscriptores (Staff, Huella/NFC)',    ruta: '/usuarios',      roles:todos },
  { id: 'suscripciones', emoji: '💵', titulo: 'Gestión de Suscripciones',      desc: 'Verificar estado, pagos y promociones (Staff)',             ruta: '/suscripciones', roles: todos },
  { id: 'nutricion',     emoji: '🍽️', titulo: 'Módulo de Nutrición',           desc: 'Registros, Recetas y Creación de Dietas',                  ruta: '/nutricion',     roles: nutriologo },
  { id: 'entrenamiento', emoji: '💪', titulo: 'Módulo de Entrenamiento',        desc: 'Carga de Ejercicios y Creación de Rutinas',                ruta: '/entrenamiento', roles: entrenador},
  { id: 'chat',          emoji: '💬', titulo: 'Módulo de Chat',                 desc: 'Comunicación con Suscriptores vía App Móvil',              ruta: '/chat',          roles: todos },
  { id: 'reportes',      emoji: '🚨', titulo: 'Gestión de Alertas y Reportes', desc: 'Monitoreo de Reportes de Incidencias (Escalada de Strikes)', ruta: '/reportes',     roles: todos },
  { id: 'recompensas',   emoji: '🏆', titulo: 'Reclamar Recompensas',           desc: 'Canje de puntos del suscriptor (Requiere Huella/NFC)',     ruta: '/recompensas',   roles: todos },
]

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [fecha, setFecha] = useState('')
  const [mostrarAccesos, setMostrarAccesos] = useState(false)

  // Para personal, el puesto define qué módulos ve
  // Para sucursal/maestro, el rol lo define directamente
  const rolRaw  = user?.rol    ?? ''
  const puesto  = user?.puesto ?? ''
  const acceso  = rolRaw === 'personal' ? puesto : rolRaw  // clave de filtrado real
  const rol     = acceso === 'personal' ? 'staff' : acceso  // normalización legacy

  const modulosVisibles = MODULOS.filter(m => m.roles.includes(rol))

  return (
    <div className="p-4 space-y-4">
      {/* BANNER INFO */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 flex flex-wrap gap-6 items-center text-sm shadow-sm">
        <span><span className="font-bold text-gray-500">Sucursal Asignada:</span> <span className="font-bold text-black"> Central</span></span>
        <span><span className="font-bold text-gray-500">Mi Rango:</span> <span className="font-bold text-black"> {ROL_LABEL[acceso] ?? ROL_LABEL[rolRaw] ?? rolRaw}</span></span>
        <span><span className="font-bold text-gray-500">Nombre:</span> <span className="font-bold text-black"> {user?.nombre}</span></span>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center">
          <p className="text-lg font-bold text-gray-700 mb-3">Suscriptores Activos</p>
          <p className="text-7xl font-black text-green-500">458</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center">
          <p className="text-lg font-bold text-gray-700 mb-3">Suscriptores Inactivos</p>
          <p className="text-7xl font-black text-red-500">12</p>
        </div>
      </div>

      {/* GRID MÓDULOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modulosVisibles.map(mod => (
          <button key={mod.id} onClick={() => navigate(mod.ruta)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center text-center hover:border-[#ea580c] hover:shadow-md transition-all group cursor-pointer">
            <span className="text-4xl mb-2">{mod.emoji}</span>
            <p className="text-sm font-bold text-[#ea580c] group-hover:text-[#c94a0a] leading-tight mb-1">{mod.titulo}</p>
            <p className="text-xs text-gray-500 leading-tight">{mod.desc}</p>
          </button>
        ))}
      </div>

      {/* HISTORIAL ACCESO */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-bold text-black mb-4">Historial de Acceso de Suscriptores</h2>
        <div className="flex items-center gap-3 mb-4">
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white" />
          <button onClick={() => setMostrarAccesos(true)}
            className="bg-[#ea580c] text-white font-bold px-5 py-2 rounded text-sm hover:bg-[#c94a0a] transition-colors">
            Mostrar Historial Por Dia
          </button>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {['Suscriptor','Día','Fecha','Hora','Método de Acceso'].map(h => (
                <th key={h} className="text-left text-[#ea580c] font-bold pb-2 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(mostrarAccesos ? MOCK_ACCESOS : []).map(a => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="py-2 pr-4 text-black">{a.suscriptor}</td>
                <td className="py-2 pr-4 text-black">{a.dia}</td>
                <td className="py-2 pr-4 text-black">{a.fecha}</td>
                <td className="py-2 pr-4 text-black">{a.hora}</td>
                <td className="py-2 text-black">{a.metodo}</td>
              </tr>
            ))}
            {!mostrarAccesos && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-400 border-t border-gray-100">Selecciona una fecha y presiona el botón</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
