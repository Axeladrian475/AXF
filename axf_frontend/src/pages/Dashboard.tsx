// ============================================================================
//  pages/Dashboard.tsx  — 100% funcional
//  - Suscriptores activos/inactivos desde GET /api/dashboard/stats
//  - Historial de accesos desde GET /api/dashboard/accesos?fecha=YYYY-MM-DD
//  - Módulos filtrados por puesto/rol igual que antes
// ============================================================================

import { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import axiosClient from '../api/axiosClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Stats {
  activos:            number
  inactivos:          number
  total_suscriptores: number
}

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

// ─── Mapeo de labels de rol ───────────────────────────────────────────────────
const ROL_LABEL: Record<string, string> = {
  staff:                 'Staff',
  entrenador:            'Entrenador',
  nutriologo:            'Nutriólogo',
  entrenador_nutriologo: 'Entrenador/Nutriólogo',
  personal:              'Staff',
  sucursal:              'Administrador Sucursal',
  maestro:               'Maestro',
}

// ─── Módulos con roles ────────────────────────────────────────────────────────
const todos      = ['staff','entrenador','nutriologo','entrenador_nutriologo']
const entrenador = ['entrenador','entrenador_nutriologo']
const nutriologo = ['nutriologo','entrenador_nutriologo']

const MODULOS = [
  { id: 'usuarios',      emoji: '👤', titulo: 'Módulo de Usuarios',            desc: 'Registrar y Modificar Suscriptores (Staff, Huella/NFC)',      ruta: '/usuarios',      roles: todos      },
  { id: 'suscripciones', emoji: '💵', titulo: 'Gestión de Suscripciones',      desc: 'Verificar estado, pagos y promociones (Staff)',               ruta: '/suscripciones', roles: todos      },
  { id: 'nutricion',     emoji: '🍽️', titulo: 'Módulo de Nutrición',           desc: 'Registros, Recetas y Creación de Dietas',                    ruta: '/nutricion',     roles: nutriologo },
  { id: 'entrenamiento', emoji: '💪', titulo: 'Módulo de Entrenamiento',        desc: 'Carga de Ejercicios y Creación de Rutinas',                  ruta: '/entrenamiento', roles: entrenador },
  { id: 'chat',          emoji: '💬', titulo: 'Módulo de Chat',                 desc: 'Comunicación con Suscriptores vía App Móvil',                ruta: '/chat',          roles: todos      },
  { id: 'reportes',      emoji: '🚨', titulo: 'Gestión de Alertas y Reportes', desc: 'Monitoreo de Reportes de Incidencias (Escalada de Strikes)',  ruta: '/reportes',      roles: todos      },
  { id: 'recompensas',   emoji: '🏆', titulo: 'Reclamar Recompensas',           desc: 'Canje de puntos del suscriptor (Requiere Huella/NFC)',       ruta: '/recompensas',   roles: todos      },
]

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? 'w-4 h-4 border-2' : 'w-6 h-6 border-4'
  return (
    <div className={`${size} border-gray-200 border-t-[#ea580c] rounded-full animate-spin`} />
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()

  // Stats
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [statsLoad,  setStatsLoad]  = useState(true)
  const [statsError, setStatsError] = useState(false)

  // Historial de accesos
  const [fecha,        setFecha]        = useState('')
  const [accesos,      setAccesos]      = useState<Acceso[]>([])
  const [accesosLoad,  setAccesosLoad]  = useState(false)
  const [accesosError, setAccesosError] = useState('')
  const [buscado,      setBuscado]      = useState(false)

  // ── Carga inicial de stats ────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setStatsLoad(true)
      setStatsError(false)
      try {
        const { data } = await axiosClient.get<Stats>('/dashboard/stats')
        setStats(data)
      } catch {
        setStatsError(true)
      } finally {
        setStatsLoad(false)
      }
    }
    cargar()
  }, [])

  // ── Buscar historial ──────────────────────────────────────────────────────
  const buscarAccesos = async () => {
    if (!fecha) {
      setAccesosError('Selecciona una fecha antes de buscar.')
      return
    }
    setAccesosLoad(true)
    setAccesosError('')
    setBuscado(true)
    try {
      const { data } = await axiosClient.get<Acceso[]>('/dashboard/accesos', {
        params: { fecha },
      })
      setAccesos(data)
    } catch {
      setAccesosError('Error al obtener el historial. Intenta de nuevo.')
      setAccesos([])
    } finally {
      setAccesosLoad(false)
    }
  }

  // ── Roles / módulos visibles ──────────────────────────────────────────────
  const rolRaw = user?.rol    ?? ''
  const puesto = user?.puesto ?? ''
  const acceso = rolRaw === 'personal' ? puesto : rolRaw
  const rol    = acceso === 'personal' ? 'staff' : acceso

  const modulosVisibles = MODULOS.filter(m => m.roles.includes(rol))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">

      {/* BANNER INFO */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 flex flex-wrap gap-6 items-center text-sm shadow-sm">
        <span>
          <span className="font-bold text-gray-500">Sucursal Asignada:</span>{' '}
          <span className="font-bold text-black">{user?.nombre_sucursal ?? '—'}</span>
        </span>
        <span>
          <span className="font-bold text-gray-500">Mi Rango:</span>{' '}
          <span className="font-bold text-black">{ROL_LABEL[acceso] ?? ROL_LABEL[rolRaw] ?? rolRaw}</span>
        </span>
        <span>
          <span className="font-bold text-gray-500">Nombre:</span>{' '}
          <span className="font-bold text-black">{user?.nombre}</span>
        </span>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 gap-4">

        <button
          onClick={() => !statsLoad && !statsError && navigate('/suscriptores?filtro=activo')}
          disabled={statsLoad || statsError}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-green-400 hover:shadow-md transition-all group disabled:cursor-default cursor-pointer w-full"
        >
          <p className="text-lg font-bold text-gray-700 mb-3">Suscriptores Activos</p>
          {statsLoad
            ? <Spinner />
            : statsError
              ? <p className="text-red-400 text-sm mt-1">Error al cargar</p>
              : <>
                  <p className="text-7xl font-black text-green-500">{stats?.activos ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-2 group-hover:text-green-500 transition-colors">Ver listado →</p>
                </>
          }
        </button>

        <button
          onClick={() => !statsLoad && !statsError && navigate('/suscriptores?filtro=inactivo')}
          disabled={statsLoad || statsError}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center hover:border-red-400 hover:shadow-md transition-all group disabled:cursor-default cursor-pointer w-full"
        >
          <p className="text-lg font-bold text-gray-700 mb-3">Suscriptores Inactivos</p>
          {statsLoad
            ? <Spinner />
            : statsError
              ? <p className="text-red-400 text-sm mt-1">Error al cargar</p>
              : <>
                  <p className="text-7xl font-black text-red-500">{stats?.inactivos ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-2 group-hover:text-red-500 transition-colors">Ver listado →</p>
                </>
          }
        </button>

      </div>

      {/* GRID MÓDULOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modulosVisibles.map(mod => (
          <button
            key={mod.id}
            onClick={() => navigate(mod.ruta)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center text-center hover:border-[#ea580c] hover:shadow-md transition-all group cursor-pointer"
          >
            <span className="text-4xl mb-2">{mod.emoji}</span>
            <p className="text-sm font-bold text-[#ea580c] group-hover:text-[#c94a0a] leading-tight mb-1">{mod.titulo}</p>
            <p className="text-xs text-gray-500 leading-tight">{mod.desc}</p>
          </button>
        ))}
      </div>

      {/* HISTORIAL DE ACCESOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-bold text-black mb-4">Historial de Acceso de Suscriptores</h2>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            value={fecha}
            onChange={e => { setFecha(e.target.value); setAccesosError('') }}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white"
          />
          <button
            onClick={buscarAccesos}
            disabled={accesosLoad}
            className="bg-[#ea580c] text-white font-bold px-5 py-2 rounded text-sm hover:bg-[#c94a0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {accesosLoad && <Spinner small />}
            Mostrar Historial Por Día
          </button>
        </div>

        {accesosError && (
          <p className="text-red-500 text-sm mb-3">❌ {accesosError}</p>
        )}

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {['Suscriptor','Día','Fecha','Hora','Método de Acceso','Movimiento'].map(h => (
                <th key={h} className="text-left text-[#ea580c] font-bold pb-2 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* Cargando */}
            {accesosLoad && (
              <tr>
                <td colSpan={5} className="py-6 text-center border-t border-gray-100">
                  <div className="flex justify-center"><Spinner /></div>
                </td>
              </tr>
            )}

            {/* Filas de datos */}
            {!accesosLoad && accesos.map((a, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-4 text-black">{a.suscriptor}</td>
                <td className="py-2 pr-4 text-black">{a.dia}</td>
                <td className="py-2 pr-4 text-black">{a.fecha}</td>
                <td className="py-2 pr-4 text-black">{a.hora}</td>
                <td className="py-2 pr-4 text-black">{a.metodo}</td>
                <td className="py-2">
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
            {!accesosLoad && buscado && accesos.length === 0 && !accesosError && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-400 border-t border-gray-100">
                  No hubo accesos registrados el {fecha.split('-').reverse().join('/')}
                </td>
              </tr>
            )}

            {/* Estado inicial */}
            {!accesosLoad && !buscado && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-400 border-t border-gray-100">
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