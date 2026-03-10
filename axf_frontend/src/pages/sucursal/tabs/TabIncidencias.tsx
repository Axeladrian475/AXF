import { useState, useEffect } from 'react'
import axiosClient from '../../../api/axiosClient'

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
    </div>
  )
}