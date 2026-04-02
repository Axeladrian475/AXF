// ============================================================================
//  pages/reportes/tabs/TabsConfiguracion.tsx  — VERSIÓN FUNCIONAL
//  Carga la configuración de tiempos de strike desde la BD y permite guardarla.
//  Endpoint: GET/PUT /api/reportes/strikes/config
// ============================================================================

import { useState, useEffect } from 'react'
import axiosClient from '../../../api/axiosClient'

interface ConfigStrikes {
  horas_strike1: number
  horas_strike2: number
  horas_strike3: number
}

type Estado = 'idle' | 'cargando' | 'guardando' | 'ok' | 'error'

export default function TabsConfiguracion() {
  const [config, setConfig]   = useState<ConfigStrikes>({ horas_strike1: 24, horas_strike2: 24, horas_strike3: 24 })
  const [estado, setEstado]   = useState<Estado>('cargando')
  const [mensaje, setMensaje] = useState('')

  // ── Cargar configuración actual desde la BD ────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setEstado('cargando')
      try {
        const { data } = await axiosClient.get('/reportes/strikes/config')
        setConfig({
          horas_strike1: data.horas_strike1 ?? 24,
          horas_strike2: data.horas_strike2 ?? 24,
          horas_strike3: data.horas_strike3 ?? 24,
        })
        setEstado('idle')
      } catch {
        setEstado('error')
        setMensaje('No se pudo cargar la configuración actual.')
      }
    }
    cargar()
  }, [])

  // ── Guardar cambios en la BD ───────────────────────────────────────────────
  const guardar = async () => {
    // Validación básica
    const { horas_strike1, horas_strike2, horas_strike3 } = config
    if ([horas_strike1, horas_strike2, horas_strike3].some(h => !h || h < 1 || h > 720)) {
      setEstado('error')
      setMensaje('Las horas deben ser un número entre 1 y 720.')
      return
    }

    setEstado('guardando')
    setMensaje('')
    try {
      const { data } = await axiosClient.put('/reportes/strikes/config', config)
      setEstado('ok')
      setMensaje(data.message ?? 'Configuración guardada correctamente.')
      // Limpiar el mensaje de éxito después de 5 segundos
      setTimeout(() => setEstado('idle'), 5000)
    } catch (err: unknown) {
      setEstado('error')
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMensaje(msg ?? 'Error al guardar. Intenta de nuevo.')
    }
  }

  const onChange = (campo: keyof ConfigStrikes, valor: string) => {
    setConfig(prev => ({ ...prev, [campo]: parseInt(valor) || 0 }))
    // Limpiar mensaje al editar
    if (estado === 'ok' || estado === 'error') setEstado('idle')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-1">Configuración de Tiempos (SLA)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Define cuántas horas deben pasar sin actividad para que se dispare cada nivel de alerta.
      </p>
      <hr className="border-gray-300 mb-5" />

      {/* Spinner de carga inicial */}
      {estado === 'cargando' ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          Cargando configuración...
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm space-y-5">

          {/* Strike 1 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1.5 align-middle" />
              Tiempo Strike 1 (Horas)
            </label>
            <p className="text-xs text-gray-400 mb-1.5">Horas sin actividad desde que se crea el reporte</p>
            <input
              type="number"
              min={1} max={720}
              value={config.horas_strike1}
              onChange={e => onChange('horas_strike1', e.target.value)}
              disabled={estado === 'guardando'}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-orange-400 disabled:opacity-50"
            />
          </div>

          {/* Strike 2 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1.5 align-middle" />
              Tiempo Strike 2 (Horas adicionales)
            </label>
            <p className="text-xs text-gray-400 mb-1.5">Horas más desde el Strike 1 sin resolución</p>
            <input
              type="number"
              min={1} max={720}
              value={config.horas_strike2}
              onChange={e => onChange('horas_strike2', e.target.value)}
              disabled={estado === 'guardando'}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-orange-400 disabled:opacity-50"
            />
          </div>

          {/* Strike 3 */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1.5 align-middle" />
              Tiempo Strike 3 (Horas adicionales)
            </label>
            <p className="text-xs text-gray-400 mb-1.5">Horas más desde el Strike 2 — Escalada máxima</p>
            <input
              type="number"
              min={1} max={720}
              value={config.horas_strike3}
              onChange={e => onChange('horas_strike3', e.target.value)}
              disabled={estado === 'guardando'}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-orange-400 disabled:opacity-50"
            />
          </div>

          {/* Resumen de tiempos totales */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1 border border-gray-100">
            <p className="font-semibold text-gray-600 mb-1">Tiempos totales desde creación:</p>
            <p>
              <span className="font-bold text-yellow-600">Strike 1</span>
              {' '}→ {config.horas_strike1}h
            </p>
            <p>
              <span className="font-bold text-orange-600">Strike 2</span>
              {' '}→ {(config.horas_strike1 || 0) + (config.horas_strike2 || 0)}h
            </p>
            <p>
              <span className="font-bold text-red-600">Strike 3</span>
              {' '}→ {(config.horas_strike1 || 0) + (config.horas_strike2 || 0) + (config.horas_strike3 || 0)}h
            </p>
          </div>

          {/* Mensaje de éxito o error */}
          {(estado === 'ok' || estado === 'error') && mensaje && (
            <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium
              ${estado === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <span className="mt-0.5 shrink-0">
                {estado === 'ok' ? '✅' : '❌'}
              </span>
              <span>{mensaje}</span>
            </div>
          )}

          {/* Botón guardar */}
          <button
            onClick={guardar}
            disabled={estado === 'guardando' || estado === 'cargando'}
            className="w-full bg-[#1e293b] text-white font-bold px-6 py-2.5 rounded hover:bg-[#0f172a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
          >
            {estado === 'guardando' ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      )}
    </div>
  )
}