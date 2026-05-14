import { useState, useEffect, useRef } from 'react'
import {
  getRecompensas,
  canjearRecompensa,
  identificarSuscriptor,
  iniciarSesionHardware,
  escucharHardwareSSE,
  type Recompensa,
  type SuscriptorIdentificado,
} from '../../api/recompensasApi'

// ── Tipos de paso en el flujo de identificación ──────────────────────────────
type SensorEstado =
  | 'idle'
  | 'pendiente'     // token generado, esperando al ESP32
  | 'leyendo'       // ESP32 recogió el token, aguardando lectura
  | 'identificando' // valor recibido, buscando suscriptor en BD
  | 'ok'            // suscriptor identificado
  | 'error'

// ── Mensajes de paso del ESP32 ───────────────────────────────────────────────
const PASOS_LEGIBLES: Record<string, string> = {
  esperando_dispositivo: 'Esperando al dispositivo…',
  listo_para_leer:       'Dispositivo listo. Acerca la tarjeta o pulsera NFC.',
  acerca_tarjeta:        'Acerca la tarjeta o pulsera NFC al lector.',
  tarjeta_detectada:     'Tarjeta detectada, procesando…',
  enviando:              'Enviando datos…',
  completado:            'Lectura completada.',
  conexion_perdida:      'Conexión perdida con el sensor.',
}

// ── Spinner reutilizable ─────────────────────────────────────────────────────
function Spinner({ small = false }: { small?: boolean }) {
  const cls = small ? 'w-4 h-4 border-2' : 'w-5 h-5 border-2'
  return (
    <div className={`${cls} border-gray-300 border-t-[#ea580c] rounded-full animate-spin`} />
  )
}

// ────────────────────────────────────────────────────────────────────────────
export default function Recompensas() {
  // ── Recompensas ──────────────────────────────────────────────────────────
  const [recompensas, setRecompensas] = useState<Recompensa[]>([])
  const [cargando,    setCargando]    = useState(true)
  const [errorApi,    setErrorApi]    = useState<string | null>(null)

  // ── Suscriptor identificado ──────────────────────────────────────────────
  const [suscriptor, setSuscriptor] = useState<SuscriptorIdentificado | null>(null)

  // ── Recompensa seleccionada ──────────────────────────────────────────────
  const [seleccionada, setSeleccionada] = useState<Recompensa | null>(null)

  // ── Flujo sensor ─────────────────────────────────────────────────────────
  const [sensorEstado, setSensorEstado] = useState<SensorEstado>('idle')
  const [sensorPaso,   setSensorPaso]   = useState<string>('')
  const [sensorError,  setSensorError]  = useState<string | null>(null)
  // cleanup de SSE o intervalo activo
  const cleanupRef = useRef<(() => void) | null>(null)

  // ── Canje ────────────────────────────────────────────────────────────────
  const [canjeOk,    setCanjeOk]    = useState<{ mensaje: string; restantes: number } | null>(null)
  const [canjeando,  setCanjeando]  = useState(false)
  const [canjeError, setCanjeError] = useState<string | null>(null)

  // ── Cargar recompensas ───────────────────────────────────────────────────
  useEffect(() => { cargarRecompensas() }, [])

  // Limpiar SSE al desmontar
  useEffect(() => () => { cleanupRef.current?.() }, [])

  async function cargarRecompensas() {
    setCargando(true)
    setErrorApi(null)
    try {
      setRecompensas(await getRecompensas())
    } catch {
      setErrorApi('No se pudieron cargar las recompensas. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  // ── Iniciar lectura de NFC (SSE) ──────────────────────────────────────
  async function iniciarNFC() {
    // Cerrar SSE anterior si existe
    cleanupRef.current?.()
    cleanupRef.current = null

    setSensorEstado('pendiente')
    setSensorPaso('esperando_dispositivo')
    setSensorError(null)
    setSuscriptor(null)

    let token: string
    try {
      const sesion = await iniciarSesionHardware('nfc')
      token = sesion.token
    } catch {
      setSensorEstado('error')
      setSensorError('No se pudo iniciar la sesión con el lector NFC.')
      return
    }

    // Escuchar actualizaciones vía SSE
    // CORREGIDO: escucharHardwareSSE ya cierra la conexión internamente en estados terminales,
    // por lo que NO llamamos cerrar() dentro del callback (evita el bug de closure).
    const cerrar = escucharHardwareSSE(token, async (poll) => {
      if (poll.estado === 'reading') {
        setSensorEstado('leyendo')
        setSensorPaso(poll.paso ?? 'listo_para_leer')
      }

      if (poll.estado === 'done' && poll.valor) {
        // SSE ya se cerró internamente; solo limpiar ref
        cleanupRef.current = null

        setSensorEstado('identificando')
        setSensorPaso('completado')
        try {
          const sus = await identificarSuscriptor('nfc', poll.valor)
          setSuscriptor(sus)
          setSensorEstado('ok')
        } catch {
          setSensorEstado('error')
          setSensorError('No se encontró ningún suscriptor con esa tarjeta NFC.')
        }
      }

      if (poll.estado === 'error') {
        // SSE ya se cerró internamente; solo limpiar ref
        cleanupRef.current = null
        setSensorEstado('error')
        const motivo = poll.paso ?? 'desconocido'
        setSensorError(
          motivo === 'nfc_no_encontrado'
            ? 'Tarjeta NFC no registrada en el sistema.'
            : motivo === 'timeout_nfc'
            ? 'No se detectó ninguna tarjeta (tiempo agotado).'
            : motivo === 'conexion_perdida'
            ? 'Se perdió la conexión con el lector NFC.'
            : `Error del lector: ${motivo}`
        )
      }
    })

    cleanupRef.current = cerrar
  }

  function cancelarSensor() {
    cleanupRef.current?.()
    cleanupRef.current = null
    setSensorEstado('idle')
    setSensorPaso('')
    setSensorError(null)
    setSuscriptor(null)
  }

  // ── Confirmar canje ──────────────────────────────────────────────────────
  async function confirmarCanje() {
    if (!seleccionada || !suscriptor) return
    setCanjeando(true)
    setCanjeError(null)
    try {
      const resultado = await canjearRecompensa(seleccionada.id_recompensa, suscriptor.id_suscriptor)
      setCanjeOk({ mensaje: resultado.message, restantes: resultado.puntos_restantes })
      setSuscriptor(prev => prev ? { ...prev, puntos: resultado.puntos_restantes } : prev)
      setSeleccionada(null)
    } catch (err: any) {
      setCanjeError(err?.response?.data?.message ?? 'Error al realizar el canje.')
    } finally {
      setCanjeando(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const puntosInsuficientes = seleccionada && suscriptor
    ? suscriptor.puntos < seleccionada.costo_puntos
    : false

  const pasoLegible = PASOS_LEGIBLES[sensorPaso] ?? sensorPaso

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">

      {/* ══ CABECERA ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-black">🏆 Módulo de Recompensas</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Identifica al suscriptor con su tarjeta o pulsera NFC y canjea sus puntos.
          </p>
        </div>
        <button
          onClick={cargarRecompensas}
          disabled={cargando}
          className="text-xs text-[#ea580c] hover:text-[#c94a0a] font-semibold disabled:opacity-40"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* ══ PASO 1: IDENTIFICAR SUSCRIPTOR ════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-black text-sm">1. Identificar Suscriptor</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Pide al suscriptor que acerque su tarjeta o pulsera al lector NFC.
          </p>
        </div>

        <div className="p-6">

          {/* Estado: idle o error */}
          {(sensorEstado === 'idle' || sensorEstado === 'error') && (
            <div className="flex flex-col gap-3">
              <button
                onClick={iniciarNFC}
                className="inline-flex items-center gap-2 bg-[#ea580c] hover:bg-[#c94a0a] active:scale-95 transition-all text-white font-bold px-5 py-2.5 rounded text-sm shadow-sm w-fit"
              >
                <span>💳</span>
                <span>Leer Tarjeta NFC</span>
              </button>

              {sensorEstado === 'error' && sensorError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-4 py-3">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <div>
                    <p className="text-red-700 text-sm font-semibold">{sensorError}</p>
                    <p className="text-red-400 text-xs mt-0.5">Intenta de nuevo.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado: leyendo / pendiente / identificando */}
          {(sensorEstado === 'pendiente' || sensorEstado === 'leyendo' || sensorEstado === 'identificando') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 border border-gray-200 rounded px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xl flex-shrink-0">
                  💳
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-black">
                    {sensorEstado === 'identificando' ? 'Identificando suscriptor…' : 'Esperando tarjeta NFC…'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{pasoLegible}</p>
                  <div className="mt-2 w-40 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ea580c] rounded-full animate-pulse w-full" />
                  </div>
                </div>
                <Spinner />
              </div>
              <button
                onClick={cancelarSensor}
                className="text-xs text-gray-400 hover:text-gray-600 underline w-fit"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Estado: ok — suscriptor identificado */}
          {sensorEstado === 'ok' && suscriptor && (
            <div className="flex items-center gap-4 border border-gray-200 rounded px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-lg flex-shrink-0">
                ✅
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Suscriptor identificado</p>
                <p className="text-black font-black text-lg leading-tight">{suscriptor.nombre}</p>
                <p className="text-sm mt-0.5">
                  <span className="font-black text-[#ea580c]">{suscriptor.puntos.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">puntos disponibles</span>
                </p>
              </div>
              <button
                onClick={cancelarSensor}
                className="text-gray-300 hover:text-gray-500 text-xl leading-none transition-colors"
                title="Cambiar suscriptor"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ PASO 2: RECOMPENSAS ════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-black text-sm">2. Recompensas Disponibles</h2>
          <p className="text-xs text-gray-400 mt-0.5">Selecciona una recompensa para canjear.</p>
        </div>

        <div className="p-6">

          {cargando && (
            <div className="flex items-center justify-center gap-3 text-gray-400 text-sm py-10">
              <Spinner />
              Cargando recompensas…
            </div>
          )}

          {!cargando && errorApi && (
            <div className="border border-red-200 bg-red-50 rounded px-4 py-3 text-center">
              <p className="text-red-600 text-sm font-semibold">{errorApi}</p>
              <button
                onClick={cargarRecompensas}
                className="mt-1 text-xs text-red-500 underline hover:text-red-700"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {!cargando && !errorApi && recompensas.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm">No hay recompensas activas en esta sucursal.</p>
            </div>
          )}

          {!cargando && recompensas.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[#ea580c] font-bold pb-2 pr-4">Recompensa</th>
                  <th className="text-left text-[#ea580c] font-bold pb-2 pr-4">Costo</th>
                  <th className="text-center text-[#ea580c] font-bold pb-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {recompensas.map((r) => {
                  const sinPuntos = suscriptor ? suscriptor.puntos < r.costo_puntos : false
                  return (
                    <tr key={r.id_recompensa} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className={`py-3 pr-4 font-medium ${sinPuntos ? 'text-gray-400' : 'text-black'}`}>
                        {r.nombre}
                      </td>
                      <td className={`py-3 pr-4 font-black ${sinPuntos ? 'text-gray-400' : 'text-[#ea580c]'}`}>
                        {r.costo_puntos.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 ml-1">pts</span>
                      </td>
                      <td className="py-3 text-center">
                        {!suscriptor ? (
                          <span className="text-xs text-gray-400 italic">Identifica al suscriptor primero</span>
                        ) : sinPuntos ? (
                          <span className="text-xs text-red-400 font-semibold">Puntos insuficientes</span>
                        ) : (
                          <button
                            onClick={() => { setSeleccionada(r); setCanjeError(null) }}
                            className="bg-[#ea580c] hover:bg-[#c94a0a] active:scale-95 transition-all text-white text-xs font-bold px-4 py-1.5 rounded shadow-sm"
                          >
                            Canjear
                          </button>
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

      {/* ══ MODAL: CONFIRMAR CANJE ══════════════════════════════════════════════ */}
      {seleccionada && suscriptor && !puntosInsuficientes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-sm p-6">

            <h3 className="font-black text-black text-lg mb-1">Confirmar Canje</h3>
            <p className="text-xs text-gray-400 mb-5">Esta acción descontará puntos al suscriptor.</p>

            <div className="border border-gray-200 rounded divide-y divide-gray-100 mb-5 text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-500">Suscriptor</span>
                <span className="font-bold text-black">{suscriptor.nombre}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-500">Recompensa</span>
                <span className="font-bold text-black">{seleccionada.nombre}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-500">Puntos actuales</span>
                <span className="font-bold text-black">{suscriptor.puntos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-500">Costo</span>
                <span className="font-black text-[#ea580c]">−{seleccionada.costo_puntos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-gray-50">
                <span className="text-gray-700 font-semibold">Puntos restantes</span>
                <span className="font-black text-green-600">
                  {(suscriptor.puntos - seleccionada.costo_puntos).toLocaleString()}
                </span>
              </div>
            </div>

            {canjeError && (
              <div className="mb-4 border border-red-200 bg-red-50 rounded px-4 py-3 text-red-600 text-xs text-center">
                {canjeError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSeleccionada(null); setCanjeError(null) }}
                disabled={canjeando}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded text-sm transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCanje}
                disabled={canjeando}
                className="flex-1 bg-[#ea580c] hover:bg-[#c94a0a] text-white font-bold py-2.5 rounded text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {canjeando
                  ? <><Spinner small /> Procesando…</>
                  : 'Confirmar'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CANJE EXITOSO ══════════════════════════════════════════════ */}
      {canjeOk && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              🎉
            </div>
            <h3 className="font-black text-black text-lg mb-1">¡Canje Exitoso!</h3>
            <p className="text-gray-500 text-sm mb-5">{canjeOk.mensaje}</p>
            <div className="border border-gray-200 rounded px-4 py-4 mb-5">
              <p className="text-xs text-gray-400 mb-1">Puntos restantes del suscriptor</p>
              <p className="text-4xl font-black text-[#ea580c]">{canjeOk.restantes.toLocaleString()}</p>
            </div>
            <button
              onClick={() => setCanjeOk(null)}
              className="w-full bg-[#ea580c] hover:bg-[#c94a0a] text-white font-bold py-2.5 rounded text-sm transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}