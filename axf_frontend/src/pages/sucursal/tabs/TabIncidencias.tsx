import { useState, useEffect } from 'react'
import axiosClient from '../../../api/axiosClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts'

interface AnalisisData {
  total: number
  pendientes_count: number
  resueltos_count: number
  tasa_resolucion: number
  pendientes: any[]
  resueltos: any[]
  categorias_chart?: { name: string, cantidad: number }[]
}

interface PersonalAnalisis {
  id_personal: number
  nombre: string
  puesto: string
  foto_url: string | null
  total_dietas: number
  total_rutinas: number
  total_reportes: number
  total_servicios: number
  tasa_reportes: number
}

type FrecuenciaTipo = 'dias' | 'semanas' | 'meses'

interface Config {
  frecuencia_tipo: FrecuenciaTipo
  valor: number
  frecuencia_dias: number
  ultimo_envio: string
  proximo_envio: string
}

// Mensaje de alerta reutilizable
function Alerta({ tipo, mensaje, onClose }: { tipo: 'exito' | 'error'; mensaje: string; onClose: () => void }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-bold mb-4
        ${tipo === 'exito'
          ? 'bg-green-50 border-green-400 text-green-800'
          : 'bg-red-50 border-red-400 text-red-800'}`}
    >
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

export default function TabIncidencias() {
  // ── Estado del formulario ───────────────────────────────────────────────────
  const [frecuenciaTipo, setFrecuenciaTipo] = useState<FrecuenciaTipo | ''>('')
  const [valor, setValor]                   = useState('')

  // ── Estado de UI ────────────────────────────────────────────────────────────
  const [cargando,   setCargando]   = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [alerta,     setAlerta]     = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
  const [configActual, setConfigActual] = useState<Config | null>(null)

  // ── Estado de Análisis ──────────────────────────────────────────────────────
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]       = useState('')
  const [analisis, setAnalisis]       = useState<AnalisisData | null>(null)
  const [analisisPersonal, setAnalisisPersonal] = useState<PersonalAnalisis[]>([])
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false)
  const [errorAnalisis, setErrorAnalisis]       = useState('')
  const [listaActiva, setListaActiva]           = useState<'ambas' | 'resueltos' | 'pendientes'>('ambas')

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    setFechaFin(end.toISOString().split('T')[0])
    setFechaInicio(start.toISOString().split('T')[0])
  }, [])

  const obtenerAnalisis = async () => {
    if (!fechaInicio || !fechaFin) {
      setErrorAnalisis('Selecciona ambas fechas')
      return
    }
    setCargandoAnalisis(true)
    setErrorAnalisis('')
    try {
      const [resReportes, resPersonal] = await Promise.all([
        axiosClient.get('/reportes/analisis', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } }),
        axiosClient.get('/reportes/analisis/personal', { params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } })
      ])
      setAnalisis(resReportes.data)
      setAnalisisPersonal(resPersonal.data)
      setListaActiva('ambas')
    } catch (err: any) {
      setErrorAnalisis(err.response?.data?.message || 'Error al obtener análisis')
    } finally {
      setCargandoAnalisis(false)
    }
  }

  // ── Cargar config existente al montar ───────────────────────────────────────
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const { data } = await axiosClient.get<Config | null>('/incidencias/config')
        if (data) {
          setConfigActual(data)
          setFrecuenciaTipo(data.frecuencia_tipo)
          setValor(String(data.valor))
        }
      } catch {
        // Si no hay config aún, el form simplemente queda vacío
      } finally {
        setCargando(false)
      }
    }
    cargarConfig()
  }, [])

  // ── Guardar configuración ───────────────────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)

    // Validación local antes de llamar al backend
    if (!frecuenciaTipo) {
      setAlerta({ tipo: 'error', mensaje: 'Selecciona una frecuencia.' })
      return
    }
    const valorNum = parseInt(valor, 10)
    if (!valorNum || valorNum <= 0) {
      setAlerta({ tipo: 'error', mensaje: 'El valor debe ser un número mayor a 0.' })
      return
    }

    setGuardando(true)
    try {
      const { data } = await axiosClient.post<{ message: string; config: Config }>('/incidencias/config', {
        frecuencia_tipo: frecuenciaTipo,
        valor: valorNum,
      })
      setConfigActual(data.config)
      setAlerta({ tipo: 'exito', mensaje: data.message })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al guardar la configuración.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setGuardando(false)
    }
  }

  // ── Helpers de formato ──────────────────────────────────────────────────────
  const formatearFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const etiquetas: Record<FrecuenciaTipo, string> = {
    dias:    'día(s)',
    semanas: 'semana(s)',
    meses:   'mes(es)',
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500 font-bold">Cargando configuración...</span>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">
        Acceso y Configuración del Módulo Análisis de Incidencias
      </h2>
      <hr className="border-gray-300 mb-4" />

      <p className="text-sm text-black mb-4">
        Aquí se visualizarán los informes automatizados generados por el sistema sobre los reportes de los suscriptores.
      </p>

      {/* Alerta de éxito / error */}
      {alerta && (
        <Alerta
          tipo={alerta.tipo}
          mensaje={alerta.mensaje}
          onClose={() => setAlerta(null)}
        />
      )}

      {/* Configuración actual guardada */}
      {configActual && (
        <div className="bg-[#1e293b] text-white rounded-lg px-5 py-4 mb-5 max-w-md">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">Configuración activa</p>
          <p className="font-bold text-white text-base">
            Cada{' '}
            <span className="text-[#ea580c]">
              {configActual.valor} {etiquetas[configActual.frecuencia_tipo]}
            </span>
          </p>
          <div className="mt-2 space-y-1 text-xs text-gray-400">
            <p>Último guardado: <span className="text-gray-200">{formatearFecha(configActual.ultimo_envio)}</span></p>
            <p>Próximo reporte: <span className="text-green-400 font-bold">{formatearFecha(configActual.proximo_envio)}</span></p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <p className="text-sm font-bold text-black mb-3">Configuración de Frecuencia de Reportes</p>
      <form className="space-y-3" onSubmit={handleGuardar}>
        <div className="max-w-xs">
          <label className="block text-sm font-bold text-black italic mb-1">
            Deseo recibir los reportes:
          </label>
          <select
            value={frecuenciaTipo}
            onChange={e => setFrecuenciaTipo(e.target.value as FrecuenciaTipo | '')}
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
            disabled={guardando}
          >
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
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="Ej. 2"
            className="w-full bg-[#d9d9d9] border border-gray-400 rounded px-3 py-2 text-black"
            disabled={guardando}
          />
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {guardando && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {guardando ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>

      {/* ── Módulo de Análisis ─────────────────────────────────────────────────── */}
      <hr className="border-gray-300 my-8" />
      <h3 className="text-lg font-bold text-black mb-1">📊 Análisis de Tasa de Resolución</h3>
      <p className="text-sm text-gray-500 mb-5">
        Genera un análisis en tiempo real de los reportes en el rango de fechas seleccionado.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-5 w-full">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Inicio</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={e => setFechaInicio(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Fin</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={e => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
            />
          </div>
          <button 
            onClick={obtenerAnalisis}
            disabled={cargandoAnalisis}
            className="bg-[#ea580c] text-white font-bold px-5 py-2 text-sm rounded hover:bg-[#c94a0a] transition-colors flex items-center h-[38px]"
          >
            {cargandoAnalisis ? 'Cargando...' : 'Obtener análisis ahora'}
          </button>
        </div>

        {errorAnalisis && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 mb-5">{errorAnalisis}</div>}

        {analisis && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Periodo</p>
                <p className="text-3xl font-black text-gray-800">{analisis.total}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center shadow-sm">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Tasa Resolución</p>
                <p className="text-3xl font-black text-emerald-600">{analisis.tasa_resolucion}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Pendientes</p>
                <p className="text-3xl font-black text-amber-600">{analisis.pendientes_count}</p>
              </div>
            </div>

            {/* ── Gráficas (Pastel y Barras) ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col items-center justify-center">
                <h4 className="text-sm font-bold text-gray-800 mb-2">Estado de Reportes</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Resueltos', value: analisis.resueltos_count, color: '#10b981' },
                          { name: 'Pendientes', value: analisis.pendientes_count, color: '#f59e0b' }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        cursor="pointer"
                        onClick={(data) => {
                          if (data.name === 'Resueltos') setListaActiva(prev => prev === 'resueltos' ? 'ambas' : 'resueltos')
                          else if (data.name === 'Pendientes') setListaActiva(prev => prev === 'pendientes' ? 'ambas' : 'pendientes')
                        }}
                      >
                        {[
                          { name: 'Resueltos', value: analisis.resueltos_count, color: '#10b981' },
                          { name: 'Pendientes', value: analisis.pendientes_count, color: '#f59e0b' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 text-center mt-1">Clickea una sección para filtrar listas</p>
                {listaActiva !== 'ambas' && (
                  <button onClick={() => setListaActiva('ambas')} className="mt-2 text-[10px] text-blue-600 underline font-bold">
                    Mostrar todas las listas
                  </button>
                )}
              </div>

              {analisis.categorias_chart && analisis.categorias_chart.length > 0 ? (
                <div className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                  <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    📊 Distribución de Reportes por Categoría
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analisis.categorias_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={50}>
                          {analisis.categorias_chart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ea580c' : '#fb923c'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex items-center justify-center">
                  <p className="text-gray-400 italic text-sm">No hay suficientes datos para la gráfica de categorías.</p>
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 ${listaActiva === 'ambas' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-5`}>
              {/* Lista Resueltos */}
              {(listaActiva === 'ambas' || listaActiva === 'resueltos') && (
                <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 shrink-0">
                    <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      ✅ Lista de Resueltos <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-xs">{analisis.resueltos_count}</span>
                    </h4>
                  </div>
                  <div className="overflow-y-auto max-h-[300px] p-3 space-y-2 flex-1">
                    {analisis.resueltos.length === 0 ? (
                      <p className="text-sm text-gray-400 p-4 text-center italic">Ningún reporte resuelto en este periodo.</p>
                    ) : (
                      analisis.resueltos.map((r: any) => (
                        <div key={r.id_reporte} className="border border-gray-100 bg-gray-50 rounded-lg p-3 hover:bg-emerald-50/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-800 text-sm">#{r.id_reporte} - {r.categoria.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Resuelto</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{r.descripcion}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            Resuelto el: {new Date(r.resuelto_en).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Lista Pendientes */}
              {(listaActiva === 'ambas' || listaActiva === 'pendientes') && (
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 shrink-0">
                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      ⏳ Lista de Pendientes <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs">{analisis.pendientes_count}</span>
                    </h4>
                  </div>
                  <div className="overflow-y-auto max-h-[300px] p-3 space-y-2 flex-1">
                    {analisis.pendientes.length === 0 ? (
                      <p className="text-sm text-gray-400 p-4 text-center italic">No hay reportes pendientes.</p>
                    ) : (
                      analisis.pendientes.map((r: any) => (
                        <div key={r.id_reporte} className="border border-gray-100 bg-gray-50 rounded-lg p-3 hover:bg-amber-50/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-800 text-sm">#{r.id_reporte} - {r.categoria.replace(/_/g, ' ')}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.estado === 'Abierto' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {r.estado}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{r.descripcion}</p>
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-amber-600 font-bold">
                              Strikes: {r.num_strikes}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Creado: {new Date(r.creado_en).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Lista de Prioridad (Urgentes o 3+ Strikes) ────────────────────── */}
            {(() => {
              const prioritarios = analisis.pendientes.filter(r => r.num_strikes >= 3 || r.categoria === 'Reporte_Personal' || r.categoria === 'Maquina_Dañada');
              if (prioritarios.length === 0) return null;
              return (
                <div className="mt-8 border border-red-300 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="bg-red-50 border-b border-red-200 px-4 py-3 shrink-0 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                      🚨 Atención Inmediata (Prioridad Alta)
                    </h4>
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-black animate-pulse">
                      {prioritarios.length} Críticos
                    </span>
                  </div>
                  <div className="overflow-x-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {prioritarios.map((r: any) => (
                        <div key={r.id_reporte} className="border-2 border-red-200 bg-red-50/30 rounded-lg p-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-10 h-10 bg-red-100 rounded-bl-full flex items-start justify-end p-2 border-l border-b border-red-200">
                            <span className="text-xs font-black text-red-600 leading-none">!</span>
                          </div>
                          <p className="font-black text-red-800 text-sm mb-1">#{r.id_reporte} - {r.categoria.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{r.descripcion}</p>
                          <div className="flex justify-between items-end">
                            <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-[10px] font-bold">
                              {r.num_strikes} Strikes
                            </span>
                            <span className="text-[10px] text-gray-500 font-semibold">
                              {new Date(r.creado_en).toLocaleDateString('es-MX', {day:'2-digit', month:'short'})}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Tabla de Tiempos de Resolución ─────────────────────────────────── */}
            <div className="mt-8 border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 shrink-0">
                <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                  ⏱️ Tiempos de Resolución (Reportes Resueltos)
                </h4>
              </div>
              <div className="overflow-x-auto p-4">
                {analisis.resueltos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center italic">No hay reportes resueltos en este periodo.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-gray-500 font-bold">Reporte</th>
                        <th className="py-2 px-3 text-gray-500 font-bold">Categoría</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Creado</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Resuelto</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Tiempo (h:m)</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Strikes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analisis.resueltos.map((r: any) => {
                        const d1 = new Date(r.creado_en).getTime()
                        const d2 = new Date(r.resuelto_en).getTime()
                        const diffMs = Math.max(0, d2 - d1)
                        const horas = Math.floor(diffMs / (1000 * 60 * 60))
                        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                        
                        const strikesNum = parseInt(r.num_strikes || '0')
                        const bgStrike = strikesNum > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50'
                        
                        return (
                          <tr key={r.id_reporte} className={`border-b border-gray-100 transition-colors ${bgStrike}`}>
                            <td className="py-2 px-3 font-bold text-gray-800">#{r.id_reporte}</td>
                            <td className="py-2 px-3 text-gray-600">{r.categoria.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3 text-center text-xs text-gray-500">
                              {new Date(r.creado_en).toLocaleDateString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="py-2 px-3 text-center text-xs text-gray-500">
                              {new Date(r.resuelto_en).toLocaleDateString('es-MX', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-gray-700">
                              {horas}h {minutos}m
                            </td>
                            <td className="py-2 px-3 text-center">
                              {strikesNum > 0 ? (
                                <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs border border-red-200">
                                  {strikesNum} Strike{strikesNum > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-xs">
                                  Limpio
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── Análisis de Personal (Servicios vs Reportes) ──────────────────────── */}
            <div className="mt-8 border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 shrink-0">
                <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  👥 Análisis de Personal (Servicios vs Reportes)
                </h4>
              </div>
              <div className="overflow-x-auto p-4">
                {analisisPersonal.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center italic">No hay personal para analizar en este periodo.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-gray-500 font-bold">Personal</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Dietas</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Rutinas</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Servicios Totales</th>
                        <th className="py-2 px-3 text-center text-red-500 font-bold">Reportes</th>
                        <th className="py-2 px-3 text-center text-gray-500 font-bold">Tasa / Riesgo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analisisPersonal.map((p) => (
                        <tr key={p.id_personal} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-3">
                              {p.foto_url ? (
                                <img 
                                  src={p.foto_url.startsWith('http') ? p.foto_url : `http://192.168.1.20:3001${p.foto_url}`} 
                                  alt="foto" 
                                  className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-200" 
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs shadow-sm border border-gray-300">
                                  👤
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-800 leading-tight">{p.nombre}</p>
                                <p className="text-[10px] text-gray-500 uppercase font-semibold">{p.puesto.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-gray-600">{p.total_dietas}</td>
                          <td className="py-2 px-3 text-center font-semibold text-gray-600">{p.total_rutinas}</td>
                          <td className="py-2 px-3 text-center font-black text-blue-600">{p.total_servicios}</td>
                          <td className="py-2 px-3 text-center font-black text-red-500">{p.total_reportes}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              p.total_reportes === 0 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : p.tasa_reportes > 10 || p.tasa_reportes === Infinity
                                  ? 'bg-red-100 text-red-700 shadow-sm'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {p.total_reportes === 0 
                                ? '0%' 
                                : p.tasa_reportes === Infinity 
                                  ? '¡Riesgo Crítico!' 
                                  : `${p.tasa_reportes}%`
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── Gráficas de Pastel por Empleado ─────────────────────────────────── */}
            {analisisPersonal.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🧑‍💼 Desglose Visual por Empleado
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {analisisPersonal.map(p => {
                    const data = [
                      { name: 'Dietas', value: p.total_dietas, color: '#3b82f6' },
                      { name: 'Rutinas', value: p.total_rutinas, color: '#10b981' },
                      { name: 'Reportes', value: p.total_reportes, color: '#ef4444' }
                    ].filter(d => d.value > 0);

                    // Si no tiene nada, mostrar un gráfico vacío gris
                    if (data.length === 0) {
                      data.push({ name: 'Sin Actividad', value: 1, color: '#e5e7eb' });
                    }

                    return (
                      <div key={p.id_personal} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center relative overflow-hidden">
                        {p.total_reportes > 0 && (
                          <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-bl-lg">
                            {p.total_reportes} Reportes
                          </div>
                        )}
                        <div className="flex items-center gap-3 w-full border-b border-gray-100 pb-3 mb-3">
                          {p.foto_url ? (
                            <img src={p.foto_url.startsWith('http') ? p.foto_url : `http://192.168.1.20:3001${p.foto_url}`} alt="foto" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">👤</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">{p.nombre}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-semibold">{p.puesto.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        
                        <div className="h-32 w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={45}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {data.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number, name: string) => [value, name]}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', padding: '4px 8px' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] font-bold">
                           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div> Dietas</div>
                           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div> Rutinas</div>
                           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div> Reportes</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}