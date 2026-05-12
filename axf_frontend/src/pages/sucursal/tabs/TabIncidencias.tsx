import { useState, useEffect } from 'react'
import axiosClient from '../../../api/axiosClient'

interface AnalisisData {
  total: number
  pendientes_count: number
  resueltos_count: number
  tasa_resolucion: number
  pendientes: any[]
  resueltos: any[]
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
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false)
  const [errorAnalisis, setErrorAnalisis]       = useState('')

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
      const res = await axiosClient.get('/reportes/analisis', {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      })
      setAnalisis(res.data)
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Lista Resueltos */}
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
                          <span className="font-bold text-gray-800 text-sm">#{r.id_reporte} - {r.categoria}</span>
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

              {/* Lista Pendientes */}
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
                          <span className="font-bold text-gray-800 text-sm">#{r.id_reporte} - {r.categoria}</span>
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}