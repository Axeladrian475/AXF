import { useState, useEffect, useRef } from 'react'
import {
  getRecompensas,
  canjearRecompensa,
  identificarSuscriptor,
  iniciarSesionHardware,
  pollHardware,
  type Recompensa,
  type SuscriptorIdentificado,
} from '../../api/recompensasApi'

// ── Tipos de paso en el flujo biométrico ────────────────────────────────────
type BiometricoEstado =
  | 'idle'
  | 'pendiente'   // token generado, esperando al ESP32
  | 'leyendo'     // ESP32 recogió el token, aguardando lectura
  | 'identificando' // valor recibido, buscando suscriptor en BD
  | 'ok'          // suscriptor identificado
  | 'error'

// ── Mensajes amigables de paso del ESP32 ────────────────────────────────────
const PASOS_LEGIBLES: Record<string, string> = {
  esperando_dispositivo: 'Esperando al dispositivo ESP32…',
  listo_para_leer:       'ESP32 listo. Acerca tu credencial o dedo.',
  acerca_tarjeta:        'Acerca la tarjeta NFC al lector.',
  tarjeta_detectada:     'Tarjeta detectada, procesando…',
  enviando:              'Enviando datos…',
  acerca_dedo_1:         'Coloca el dedo en el sensor.',
  dedo_1_ok:             'Primera lectura OK. Levanta el dedo.',
  retira_dedo:           'Retira el dedo del sensor.',
  acerca_dedo_2:         'Vuelve a colocar el dedo.',
  dedo_2_ok:             'Segunda lectura OK.',
  creando_modelo:        'Creando modelo biométrico…',
  guardando:             'Guardando huella…',
  completado:            'Lectura completada.',
}

// ────────────────────────────────────────────────────────────────────────────
export default function Recompensas() {
  // ── Estado principal ─────────────────────────────────────────────────────
  const [recompensas,  setRecompensas]  = useState<Recompensa[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [errorApi,     setErrorApi]     = useState<string | null>(null)

  // ── Suscriptor identificado ──────────────────────────────────────────────
  const [suscriptor,   setSuscriptor]   = useState<SuscriptorIdentificado | null>(null)

  // ── Recompensa seleccionada para canjear ─────────────────────────────────
  const [seleccionada, setSeleccionada] = useState<Recompensa | null>(null)

  // ── Flujo biométrico ─────────────────────────────────────────────────────
  const [bioEstado,    setBioEstado]    = useState<BiometricoEstado>('idle')
  const [bioPaso,      setBioPaso]      = useState<string>('')
  const [bioTipo,      setBioTipo]      = useState<'nfc' | 'huella' | null>(null)
  const [bioError,     setBioError]     = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Modal de resultado de canje ──────────────────────────────────────────
  const [canjeOk,      setCanjeOk]      = useState<{ mensaje: string; restantes: number } | null>(null)
  const [canjeando,    setCanjeando]    = useState(false)
  const [canjeError,   setCanjeError]   = useState<string | null>(null)

  // ── Cargar recompensas al montar ─────────────────────────────────────────
  useEffect(() => {
    cargarRecompensas()
  }, [])

  // ── Limpiar polling al desmontar ─────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function cargarRecompensas() {
    setCargando(true)
    setErrorApi(null)
    try {
      const data = await getRecompensas()
      setRecompensas(data)
    } catch {
      setErrorApi('No se pudieron cargar las recompensas. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  // ── Iniciar lectura biométrica ────────────────────────────────────────────
  async function iniciarBiometrico(tipo: 'nfc' | 'huella') {
    if (pollRef.current) clearInterval(pollRef.current)
    setBioTipo(tipo)
    setBioEstado('pendiente')
    setBioPaso('esperando_dispositivo')
    setBioError(null)
    setSuscriptor(null)

    let token: string
    try {
      const sesion = await iniciarSesionHardware(tipo)
      token = sesion.token
    } catch {
      setBioEstado('error')
      setBioError('Error al iniciar sesión con el dispositivo.')
      return
    }

    // Polling cada 1.5 s
    pollRef.current = setInterval(async () => {
      try {
        const poll = await pollHardware(token)

        if (poll.estado === 'reading') {
          setBioEstado('leyendo')
          setBioPaso(poll.paso ?? 'listo_para_leer')
        }

        if (poll.estado === 'done' && poll.valor) {
          clearInterval(pollRef.current!)
          setBioEstado('identificando')
          setBioPaso('completado')
          try {
            const sus = await identificarSuscriptor(tipo, poll.valor)
            setSuscriptor(sus)
            setBioEstado('ok')
          } catch {
            setBioEstado('error')
            setBioError('No se encontró ningún suscriptor con esa identificación.')
          }
        }

        if (poll.estado === 'error') {
          clearInterval(pollRef.current!)
          setBioEstado('error')
          setBioError(`Error del dispositivo: ${poll.paso ?? 'desconocido'}`)
        }
      } catch {
        clearInterval(pollRef.current!)
        setBioEstado('error')
        setBioError('Perdimos la conexión con el dispositivo.')
      }
    }, 1500)
  }

  function cancelarBiometrico() {
    if (pollRef.current) clearInterval(pollRef.current)
    setBioEstado('idle')
    setBioPaso('')
    setBioError(null)
    setSuscriptor(null)
    setBioTipo(null)
  }

  // ── Confirmar canje ───────────────────────────────────────────────────────
  async function confirmarCanje() {
    if (!seleccionada || !suscriptor) return
    setCanjeando(true)
    setCanjeError(null)
    try {
      const resultado = await canjearRecompensa(seleccionada.id_recompensa, suscriptor.id_suscriptor)
      setCanjeOk({ mensaje: resultado.message, restantes: resultado.puntos_restantes })
      // Actualizar puntos del suscriptor en UI
      setSuscriptor(prev => prev ? { ...prev, puntos: resultado.puntos_restantes } : prev)
      setSeleccionada(null)
    } catch (err: any) {
      setCanjeError(err?.response?.data?.message ?? 'Error al realizar el canje.')
    } finally {
      setCanjeando(false)
    }
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────
  const puntosInsuficientes = seleccionada && suscriptor
    ? suscriptor.puntos < seleccionada.costo_puntos
    : false

  const pasosLegible = PASOS_LEGIBLES[bioPaso] ?? bioPaso

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-5">

      {/* ══ CABECERA ═══════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-black text-white tracking-tight">🏆 Módulo de Recompensas</h1>
        <p className="text-orange-100 text-sm mt-1">
          Identifica al suscriptor con su huella o tarjeta NFC y canjea sus puntos.
        </p>
      </div>

      {/* ══ PANEL: IDENTIFICAR SUSCRIPTOR ══════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h2 className="font-bold text-gray-800 text-lg">1. Identificar Suscriptor</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pide al suscriptor que coloque su dedo o acerque su tarjeta NFC.
          </p>
        </div>

        <div className="p-6">
          {/* Botones de acción biométrica */}
          {(bioEstado === 'idle' || bioEstado === 'error') && (
            <div className="flex flex-wrap gap-3">
              <button
                id="btn-verificar-huella"
                onClick={() => iniciarBiometrico('huella')}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-md"
              >
                <span className="text-xl">👆</span>
                <span>Verificar Huella</span>
              </button>
              <button
                id="btn-leer-nfc"
                onClick={() => iniciarBiometrico('nfc')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold px-5 py-3 rounded-xl shadow-md"
              >
                <span className="text-xl">💳</span>
                <span>Leer NFC</span>
              </button>
            </div>
          )}

          {/* Error biométrico */}
          {bioEstado === 'error' && bioError && (
            <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">{bioError}</p>
                <p className="text-red-500 text-xs mt-1">Intenta de nuevo.</p>
              </div>
            </div>
          )}

          {/* Progreso biométrico */}
          {(bioEstado === 'pendiente' || bioEstado === 'leyendo' || bioEstado === 'identificando') && (
            <div className="flex flex-col gap-4">
              {/* Indicador visual animado */}
              <div className="flex items-center gap-4 bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-3xl animate-pulse">
                    {bioTipo === 'huella' ? '👆' : '💳'}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white animate-ping" />
                </div>
                <div>
                  <p className="font-bold text-orange-800 text-sm">
                    {bioEstado === 'identificando'
                      ? 'Identificando suscriptor…'
                      : `Leyendo ${bioTipo === 'huella' ? 'huella digital' : 'tarjeta NFC'}…`}
                  </p>
                  <p className="text-orange-600 text-xs mt-0.5">{pasosLegible}</p>
                  {/* Barra de progreso indeterminada */}
                  <div className="mt-2 w-48 h-1.5 bg-orange-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-full" />
                  </div>
                </div>
              </div>
              <button
                onClick={cancelarBiometrico}
                className="self-start text-xs text-gray-500 underline hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Suscriptor identificado */}
          {bioEstado === 'ok' && suscriptor && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 bg-green-50 border border-green-300 rounded-2xl p-5">
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-3xl shadow-md">
                  ✅
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Suscriptor identificado</p>
                  <p className="text-green-900 font-black text-xl leading-tight">{suscriptor.nombre}</p>
                  <p className="text-green-700 text-sm mt-1">
                    <span className="font-bold text-orange-600 text-lg">{suscriptor.puntos.toLocaleString()}</span>
                    <span className="ml-1 text-gray-500">puntos disponibles</span>
                  </p>
                </div>
                <button
                  onClick={cancelarBiometrico}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
                  title="Cambiar suscriptor"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ PANEL: CATÁLOGO DE RECOMPENSAS ══════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">2. Recompensas Disponibles</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecciona una recompensa para canjear.</p>
          </div>
          <button
            onClick={cargarRecompensas}
            disabled={cargando}
            className="text-xs text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1 disabled:opacity-40"
          >
            🔄 Actualizar
          </button>
        </div>

        <div className="p-6">
          {/* Estado de carga */}
          {cargando && (
            <div className="flex items-center gap-3 text-gray-500 text-sm py-8 justify-center">
              <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Cargando recompensas desde la base de datos…
            </div>
          )}

          {/* Error API */}
          {!cargando && errorApi && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-700 font-semibold text-sm">{errorApi}</p>
              <button
                onClick={cargarRecompensas}
                className="mt-2 text-xs text-red-600 underline hover:text-red-800"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* Sin recompensas */}
          {!cargando && !errorApi && recompensas.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-sm">No hay recompensas activas en esta sucursal.</p>
            </div>
          )}

          {/* Tabla de recompensas */}
          {!cargando && recompensas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    <th className="border border-orange-200 px-4 py-3 text-left font-bold text-orange-800">Recompensa</th>
                    <th className="border border-orange-200 px-4 py-3 text-left font-bold text-orange-800">Costo en Puntos</th>
                    <th className="border border-orange-200 px-4 py-3 text-center font-bold text-orange-800">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recompensas.map((r) => {
                    const sinPuntos = suscriptor ? suscriptor.puntos < r.costo_puntos : false
                    return (
                      <tr
                        key={r.id_recompensa}
                        className={`transition-colors ${sinPuntos ? 'bg-gray-50' : 'bg-white hover:bg-orange-50'}`}
                      >
                        <td className={`border border-gray-200 px-4 py-3 font-medium ${sinPuntos ? 'text-gray-400' : 'text-gray-800'}`}>
                          {r.nombre}
                        </td>
                        <td className={`border border-gray-200 px-4 py-3 font-black text-lg ${sinPuntos ? 'text-gray-400' : 'text-orange-600'}`}>
                          {r.costo_puntos.toLocaleString()}
                          <span className="text-xs font-normal text-gray-400 ml-1">pts</span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          {!suscriptor ? (
                            <span className="text-xs text-gray-400 italic">Identifica al suscriptor primero</span>
                          ) : sinPuntos ? (
                            <span className="text-xs text-red-400 font-semibold">Puntos insuficientes</span>
                          ) : (
                            <button
                              id={`btn-canjear-${r.id_recompensa}`}
                              onClick={() => { setSeleccionada(r); setCanjeError(null) }}
                              className="bg-orange-600 hover:bg-orange-700 active:scale-95 transition-all text-white text-xs font-bold px-5 py-2 rounded-lg shadow"
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
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: CONFIRMAR CANJE ══════════════════════════════════════════ */}
      {seleccionada && suscriptor && !puntosInsuficientes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <p className="text-5xl mb-3">🏆</p>
              <h3 className="font-black text-gray-900 text-xl">Confirmar Canje</h3>
              <p className="text-gray-500 text-sm mt-1">Esta acción descontará puntos al suscriptor.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Suscriptor:</span>
                <span className="font-bold text-gray-800">{suscriptor.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recompensa:</span>
                <span className="font-bold text-gray-800">{seleccionada.nombre}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-gray-500">Puntos actuales:</span>
                <span className="font-bold text-gray-800">{suscriptor.puntos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Costo:</span>
                <span className="font-black text-orange-600">-{seleccionada.costo_puntos.toLocaleString()}</span>
              </div>
              <div className="border-t border-orange-200 pt-2 flex justify-between">
                <span className="text-gray-700 font-semibold">Puntos restantes:</span>
                <span className="font-black text-green-600">{(suscriptor.puntos - seleccionada.costo_puntos).toLocaleString()}</span>
              </div>
            </div>

            {canjeError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
                {canjeError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSeleccionada(null); setCanjeError(null) }}
                disabled={canjeando}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-canje"
                onClick={confirmarCanje}
                disabled={canjeando}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {canjeando
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Procesando…</>
                  : 'Confirmar Canje'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CANJE EXITOSO ════════════════════════════════════════════ */}
      {canjeOk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
              🎉
            </div>
            <h3 className="font-black text-gray-900 text-xl mb-2">¡Canje Exitoso!</h3>
            <p className="text-gray-600 text-sm mb-4">{canjeOk.mensaje}</p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500">Puntos restantes del suscriptor</p>
              <p className="text-3xl font-black text-green-600">{canjeOk.restantes.toLocaleString()}</p>
            </div>
            <button
              id="btn-cerrar-exito"
              onClick={() => setCanjeOk(null)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
