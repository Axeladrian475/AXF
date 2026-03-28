import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSuscripciones,
  getSuscripcionActiva,
  suscribirSuscriptor,
  type TipoSuscripcion,
  type SuscripcionActiva,
  type SuscripcionItem,
} from '../../../api/suscripcionesApi'
import { crearPreferenciaPago, verificarPago, esperarPagoExtref } from '../../../api/pagosApi'

const TERMINOS = [
  'Definición y Alcance del Servicio: Acceso a instalaciones y equipos.',
  'Registro y Gestión de Cuentas: Datos verídicos obligatorios.',
  'Seguridad de Datos y Privacidad: Protección conforme a la ley.',
  'Condiciones de Pago: Pago único en exhibición.',
  'Propiedad Intelectual y Licencias: Uso de marca AxF.',
  'Terminación de la Suscripción: Reglas de cancelación.',
  'Limitación de Responsabilidad e Indemnización: Uso bajo propio riesgo.',
]

interface Props {
  suscriptorId: string
  suscriptorNombre: string
}

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Barra de progreso del periodo vigente
function BarraPeriodo({ inicio, fin }: { inicio: string; fin: string }) {
  const hoy   = Date.now()
  const start = new Date(inicio.slice(0, 10)).getTime()
  const end   = new Date(fin.slice(0, 10)).getTime()
  const total = end - start
  const pct   = Math.min(100, Math.max(0, Math.round(((hoy - start) / total) * 100)))
  const diasRestantes = Math.max(0, Math.ceil((end - hoy) / 86_400_000))
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{fmtFecha(inicio)}</span>
        <span className="font-bold text-white">{diasRestantes} días restantes</span>
        <span>{fmtFecha(fin)}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div
          className="bg-green-400 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Tarjeta de cada suscripción acumulada
function TarjetaSuscripcion({
  sub,
  index,
  esCorriendo,
}: {
  sub: SuscripcionItem
  index: number
  esCorriendo: boolean
}) {
  return (
    <div className={`rounded-lg border-2 px-4 py-3 flex gap-3 items-start
      ${esCorriendo ? 'border-green-400 bg-[#162032]' : 'border-gray-600 bg-[#1e293b]'}`}>
      {/* Número de orden */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5
        ${esCorriendo ? 'bg-green-400 text-[#1e293b]' : 'bg-gray-600 text-gray-300'}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black text-white text-sm">{sub.plan_nombre}</p>
          {esCorriendo && (
            <span className="bg-green-400 text-[#1e293b] text-xs font-black px-2 py-0.5 rounded-full">
              EN CURSO
            </span>
          )}
          {!esCorriendo && (
            <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
              ACUMULADA
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-0.5">
          {fmtFecha(sub.fecha_inicio)} → {fmtFecha(sub.fecha_fin)}
          <span className="ml-2 text-gray-500">({sub.plan_duracion_dias} días)</span>
        </p>
        {(sub.sesiones_nutriologo_restantes > 0 || sub.sesiones_entrenador_restantes > 0) && (
          <p className="text-xs text-gray-400 mt-1">
            {sub.sesiones_nutriologo_restantes > 0 && `🥗 ${sub.sesiones_nutriologo_restantes} nutriólogo  `}
            {sub.sesiones_entrenador_restantes > 0 && `🏋️ ${sub.sesiones_entrenador_restantes} entrenador`}
          </p>
        )}
      </div>
      <p className="text-gray-300 text-sm font-bold shrink-0">
        ${Number(sub.plan_precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

// ── Constantes de retry (backoff exponencial) ─────────────────────────────────
const RETRY_DELAYS = [3000, 5000, 8000, 12000, 20000] // ms entre intentos

export default function TabsAdministrarSuscripcion({ suscriptorId, suscriptorNombre }: Props) {
  const [planes, setPlanes]               = useState<TipoSuscripcion[]>([])
  const [estadoActivo, setEstadoActivo]   = useState<SuscripcionActiva | null>(null)
  const [cargandoPlanes, setCargandoPlanes] = useState(true)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [errorPlanes, setErrorPlanes]     = useState<string | null>(null)

  const [planSeleccionado, setPlanSeleccionado]   = useState<TipoSuscripcion | null>(null)
  const [modalTerminos, setModalTerminos]         = useState(false)
  const [modalPago, setModalPago]                 = useState(false)
  const [aceptaTerminos, setAceptaTerminos]       = useState(false)
  const [procesando, setProcesando]               = useState(false)
  const [procesandoMP, setProcesandoMP]           = useState(false)

  // Estado para el proceso de verificación post-pago MP
  const [verificandoPago, setVerificandoPago]     = useState(false)
  const [intentoVerif, setIntentoVerif]           = useState(0)
  const [pagoConfirmado, setPagoConfirmado]       = useState<{
    plan_nombre: string
    fecha_fin: string
  } | null>(null)

  const [toast, setToast] = useState<{ tipo: 'ok' | 'err' | 'info'; msg: string } | null>(null)

  // Estado polling MP (pestaña nueva abierta)
  const [esperandoMP, setEsperandoMP]           = useState<{
    external_reference: string
    plan_nombre: string
    mpWindow: Window | null
  } | null>(null)
  const pollingRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const mostrarToast = (tipo: 'ok' | 'err' | 'info', msg: string, duracion = 6000) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), duracion)
  }

  const cargarDatos = useCallback(async () => {
    setCargandoPlanes(true)
    setCargandoEstado(true)
    setErrorPlanes(null)
    try {
      const [p, e] = await Promise.all([
        getSuscripciones(),
        getSuscripcionActiva(Number(suscriptorId)),
      ])
      setPlanes(p)
      setEstadoActivo(e)
    } catch {
      setErrorPlanes('No se pudieron cargar los datos. Verifica la conexión.')
    } finally {
      setCargandoPlanes(false)
      setCargandoEstado(false)
    }
  }, [suscriptorId])

  // ── Verificación con retry robusto tras redirect de Mercado Pago ─────────────
  //   MP puede tardar varios segundos en enviar el webhook; hacemos polling.
  //   Usamos tanto payment_id (que MP incluye en el redirect) como extref (que
  //   pusimos nosotros en back_urls para triangular si el payment_id no llega).
  const iniciarVerificacionMP = useCallback(async (
    paymentId: string | null,
    extref: string | null,
    intento: number
  ) => {
    // Elegir la referencia de búsqueda: preferimos payment_id numérico
    const ref = paymentId ?? extref
    if (!ref) {
      setVerificandoPago(false)
      mostrarToast('err', '⚠️ No se encontró referencia de pago para verificar.')
      cargarDatos()
      return
    }

    setIntentoVerif(intento + 1)

    try {
      const result = await verificarPago(ref)

      if (result.procesado) {
        setVerificandoPago(false)
        // Limpiar pago pendiente ahora que está confirmado
        localStorage.removeItem('axf_pago_pendiente')
        setPagoConfirmado({
          plan_nombre: result.suscripcion!.plan_nombre,
          fecha_fin:   result.suscripcion!.fecha_fin,
        })
        cargarDatos()
        return
      }

      if (result.aprobado) {
        // MP aprobó el pago pero el webhook aún no llegó → reintentamos
        if (intento < RETRY_DELAYS.length - 1) {
          retryTimeoutRef.current = setTimeout(
            () => iniciarVerificacionMP(paymentId, extref, intento + 1),
            RETRY_DELAYS[intento]
          )
        } else {
          // Agotamos reintentos — el webhook llegará eventualmente
          setVerificandoPago(false)
          mostrarToast('info', '⏳ Pago aprobado por MP. La suscripción se activará en breve (puede tardar 1-2 min).', 10000)
          cargarDatos()
        }
        return
      }

      // Pago no aprobado aún — seguimos reintentando por si cambia de estado
      if (intento < RETRY_DELAYS.length - 1) {
        retryTimeoutRef.current = setTimeout(
          () => iniciarVerificacionMP(paymentId, extref, intento + 1),
          RETRY_DELAYS[intento]
        )
      } else {
        setVerificandoPago(false)
        mostrarToast('err', '⚠️ El pago fue procesado pero está pendiente de confirmación.')
        cargarDatos()
      }

    } catch {
      if (intento < RETRY_DELAYS.length - 1) {
        retryTimeoutRef.current = setTimeout(
          () => iniciarVerificacionMP(paymentId, extref, intento + 1),
          RETRY_DELAYS[intento]
        )
      } else {
        setVerificandoPago(false)
        mostrarToast('err', 'No se pudo verificar el estado del pago. Recarga la página.')
        cargarDatos()
      }
    }
  }, [cargarDatos]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Al montar: revisar si venimos de retorno de Mercado Pago ────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const tipoPago  = params.get('pago')
    const paymentId = params.get('payment_id')   // MP lo agrega automáticamente
    const extref    = params.get('extref')        // Lo pusimos nosotros en back_urls

    // ── Caso A: MP redirigió con query params ────────────────────────────────
    if (tipoPago === 'exitoso') {
      window.history.replaceState({}, '', window.location.pathname)
      setVerificandoPago(true)
      iniciarVerificacionMP(paymentId, extref, 0)

    } else if (tipoPago === 'fallido') {
      window.history.replaceState({}, '', window.location.pathname)
      mostrarToast('err', '❌ El pago fue cancelado o rechazado por Mercado Pago.')

    } else if (tipoPago === 'pendiente') {
      window.history.replaceState({}, '', window.location.pathname)
      mostrarToast('info', '⏳ El pago está pendiente de confirmación por Mercado Pago.')

    } else {
      // ── Caso B: sin query params — revisar localStorage ─────────────────────
      // Esto ocurre cuando MP no redirige automáticamente y el usuario
      // regresa manualmente. Suscripciones.tsx ya cargó al suscriptor correcto.
      try {
        const raw = localStorage.getItem('axf_pago_pendiente')
        if (raw) {
          const pendiente = JSON.parse(raw) as {
            external_reference: string
            id_suscriptor: string
            ts: number
          }
          const TREINTA_MIN = 30 * 60 * 1000
          const mismoSuscriptor = pendiente.id_suscriptor === String(suscriptorId)
          const reciente        = Date.now() - pendiente.ts < TREINTA_MIN

          if (mismoSuscriptor && reciente) {
            setVerificandoPago(true)
            iniciarVerificacionMP(null, pendiente.external_reference, 0)
          } else if (!reciente) {
            localStorage.removeItem('axf_pago_pendiente')
          }
        }
      } catch {
        localStorage.removeItem('axf_pago_pendiente')
      }
    }

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [suscriptorId]) // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => { cargarDatos() }, [suscriptorId])

  const handleSeleccionarPlan = (plan: TipoSuscripcion) => {
    setPlanSeleccionado(plan)
    setAceptaTerminos(false)
    setModalTerminos(true)
  }

  const handleContinuarPago = () => {
    if (!aceptaTerminos) return
    setModalTerminos(false)
    setModalPago(true)
  }

  // ── Pago en caja (sin MP) ───────────────────────────────────────────────────
  const handleConfirmarPago = async () => {
    if (!planSeleccionado) return
    setProcesando(true)
    try {
      const res = await suscribirSuscriptor(Number(suscriptorId), {
        id_tipo: planSeleccionado.id_tipo,
        mp_payment_id: null,
      })
      setModalPago(false)
      mostrarToast('ok',
        res.acumulada
          ? `✅ Plan acumulado hasta ${fmtFecha(res.fecha_fin)}.`
          : `✅ Suscripción activa hasta ${fmtFecha(res.fecha_fin)}.`
      )
      const nuevo = await getSuscripcionActiva(Number(suscriptorId))
      setEstadoActivo(nuevo)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al procesar la suscripción.'
      mostrarToast('err', msg)
    } finally {
      setProcesando(false)
    }
  }

  // ── Pago con Mercado Pago (nueva pestaña + polling automático) ──────────────
  const handlePagarMercadoPago = async () => {
    if (!planSeleccionado) return
    setProcesandoMP(true)
    try {
      const data = await crearPreferenciaPago({
        id_suscriptor: Number(suscriptorId),
        id_tipo:       planSeleccionado.id_tipo,
      })

      // Guardar en localStorage (por si el polling falla)
      localStorage.setItem('axf_pago_pendiente', JSON.stringify({
        external_reference: data.external_reference,
        id_suscriptor:      String(suscriptorId),
        plan_nombre:        planSeleccionado.nombre,
        ts:                 Date.now(),
      }))

      // Abrir MP en nueva pestaña (nuestra página sigue activa)
      const url      = data.sandbox_init_point ?? data.init_point
      const mpWindow = window.open(url, '_blank')

      setModalPago(false)
      setEsperandoMP({ external_reference: data.external_reference, plan_nombre: planSeleccionado.nombre, mpWindow })

      // Iniciar polling cada 3 segundos
      pollingRef.current = setInterval(async () => {
        try {
          const result = await esperarPagoExtref(data.external_reference)
          if (result.encontrado && result.procesado && result.suscripcion) {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            localStorage.removeItem('axf_pago_pendiente')
            setEsperandoMP(null)
            setPagoConfirmado({
              plan_nombre: result.suscripcion.plan_nombre,
              fecha_fin:   result.suscripcion.fecha_fin,
            })
            cargarDatos()
            // Cerrar pestaña de MP si sigue abierta
            try { mpWindow?.close() } catch { /* ignorar */ }
          }
        } catch { /* seguir reintentando */ }
      }, 3000)

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al conectar con Mercado Pago.'
      mostrarToast('err', `❌ ${msg}`)
      setProcesandoMP(false)
    }
  }


  const tieneActiva      = estadoActivo?.activa
  const subs             = estadoActivo?.suscripciones ?? []
  const vigente          = estadoActivo?.vigente
  const totales          = estadoActivo?.totales
  const vencimientoFinal = estadoActivo?.vencimiento_final

  // ── Color del toast ──────────────────────────────────────────────────────────
  const toastColor = toast?.tipo === 'ok'
    ? 'bg-green-600'
    : toast?.tipo === 'info'
      ? 'bg-blue-600'
      : 'bg-red-600'

  return (
    <div className="space-y-5 relative">

      {/* Overlay: esperando confirmación de pago en otra pestaña */}
      {esperandoMP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Cabecera animada */}
            <div className="bg-gradient-to-r from-[#009ee3] to-[#006eb5] px-8 py-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="absolute rounded-full bg-white"
                    style={{ width: 80 + i * 20, height: 80 + i * 20,
                             top: `${-20 + i * 15}%`, left: `${-10 + i * 18}%`,
                             opacity: 0.3 - i * 0.04 }} />
                ))}
              </div>
              {/* Logo MP */}
              <div className="relative flex justify-center mb-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="font-black text-[#009ee3] text-2xl">MP</span>
                </div>
              </div>
              <p className="text-white font-black text-xl">Pago en proceso</p>
              <p className="text-blue-100 text-sm mt-1">
                Completa tu pago en la pestaña de Mercado Pago
              </p>
            </div>

            {/* Cuerpo */}
            <div className="px-8 py-7 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 bg-[#009ee3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-[#009ee3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-[#009ee3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-gray-700 font-bold text-sm">Esperando confirmación...</p>
              </div>

              <div className="bg-gray-50 rounded-2xl px-5 py-4 mb-5 text-left">
                <p className="text-xs text-gray-500 mb-1">Plan seleccionado:</p>
                <p className="font-black text-gray-900">{esperandoMP.plan_nombre}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                  Verificando pago automáticamente cada 3 segundos
                </p>
              </div>

              <p className="text-xs text-gray-400 mb-5">
                Una vez que apruebes el pago en MP, la suscripción
                se activará automáticamente sin necesidad de hacer nada más.
              </p>

              <button
                onClick={() => {
                  clearInterval(pollingRef.current!)
                  pollingRef.current = null
                  setEsperandoMP(null)
                  mostrarToast('info', 'Pago cancelado. Puedes intentarlo de nuevo.')
                }}
                className="text-gray-400 text-sm hover:text-gray-600 underline"
              >
                Cancelar y volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-bold max-w-sm
          ${toastColor}`}>
          {toast.msg}
        </div>
      )}

      {/* Panel de pago confirmado — visible al regresar de Mercado Pago */}
      {pagoConfirmado && (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative flex items-start gap-5">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
              ✅
            </div>
            <div className="flex-1">
              <p className="font-black text-xl leading-tight">¡Pago acreditado con éxito!</p>
              <p className="text-green-100 text-sm mt-1">
                Plan <span className="font-bold text-white">{pagoConfirmado.plan_nombre}</span> activo
                hasta <span className="font-bold text-white">{fmtFecha(pagoConfirmado.fecha_fin)}</span>.
              </p>
              <p className="text-green-200 text-xs mt-2">
                El pago fue verificado y la suscripción ya está registrada en el sistema.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPagoConfirmado(null)}
            className="mt-4 w-full bg-white text-green-700 font-black py-2.5 rounded-xl hover:bg-green-50 transition-colors text-sm"
          >
            Continuar en AXF →
          </button>
        </div>
      )}

      {/* Banner de verificación en curso */}
      {verificandoPago && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-5 flex items-center gap-4 text-white shadow-lg">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-base">¡Pago recibido! Verificando con Mercado Pago...</p>
            <p className="text-blue-100 text-xs mt-0.5">
              Intento {intentoVerif} de {RETRY_DELAYS.length}. Esto toma solo unos segundos.
            </p>
            <div className="mt-2 w-full h-1 bg-blue-400/40 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full animate-pulse" style={{ width: `${(intentoVerif / RETRY_DELAYS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* INFO SUSCRIPTOR */}
      <div className="border border-gray-300 rounded-lg px-5 py-4 bg-white">
        <p className="font-black text-xl text-black">{suscriptorNombre}</p>
        <p className="text-gray-500 text-sm">ID: SUS-{String(suscriptorId).padStart(5, '0')}</p>
      </div>

      {/* ESTADO DE SUSCRIPCIÓN */}
      {cargandoEstado ? (
        <div className="bg-gray-100 rounded-lg px-5 py-6 text-center text-gray-400 text-sm">
          Cargando estado de suscripción...
        </div>
      ) : tieneActiva && vigente ? (
        <div className="bg-[#1e293b] text-white rounded-lg px-5 py-4 space-y-4">

          {/* Cabecera: resumen general */}
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-bold text-green-400 flex items-center gap-1 text-sm">✅ Estado: ACTIVA</p>
              <p className="text-gray-400 text-xs mt-1">Vencimiento final (acumulado):</p>
              <p className="font-black text-green-400 text-2xl">{fmtFecha(vencimientoFinal!)}</p>
            </div>

            {/* Totales de sesiones acumuladas */}
            <div className="flex gap-3">
              {(totales?.sesiones_nutriologo ?? 0) > 0 && (
                <div className="bg-[#0f172a] rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <p className="text-2xl">🥗</p>
                  <p className="font-black text-white text-xl">{totales!.sesiones_nutriologo}</p>
                  <p className="text-gray-400 text-xs">sesiones nutriólogo</p>
                </div>
              )}
              {(totales?.sesiones_entrenador ?? 0) > 0 && (
                <div className="bg-[#0f172a] rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <p className="text-2xl">🏋️</p>
                  <p className="font-black text-white text-xl">{totales!.sesiones_entrenador}</p>
                  <p className="text-gray-400 text-xs">sesiones entrenador</p>
                </div>
              )}
              {(totales?.sesiones_nutriologo ?? 0) === 0 && (totales?.sesiones_entrenador ?? 0) === 0 && (
                <div className="bg-[#0f172a] rounded-lg px-4 py-2 text-center">
                  <p className="text-gray-400 text-xs">Sin sesiones adicionales</p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de progreso del periodo en curso */}
          <BarraPeriodo inicio={vigente.fecha_inicio} fin={vigente.fecha_fin} />

          {/* Línea de tiempo de todas las suscripciones */}
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              {subs.length} suscripción{subs.length !== 1 ? 'es' : ''} comprada{subs.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {subs.map((s, i) => (
                <TarjetaSuscripcion
                  key={s.id_suscripcion}
                  sub={s}
                  index={i}
                  esCorriendo={i === 0}
                />
              ))}
            </div>
          </div>

          {subs.length > 1 && (
            <p className="text-gray-400 text-xs border-t border-gray-700 pt-2">
              ℹ Las suscripciones acumuladas se activarán automáticamente al vencer la anterior.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-200 rounded-lg px-5 py-4 text-center">
          <p className="text-gray-500 font-bold">Sin suscripción activa</p>
          <p className="text-gray-400 text-xs mt-1">Selecciona un plan para suscribir a este usuario.</p>
        </div>
      )}

      {/* PLANES */}
      <div>
        <h3 className="font-bold text-black text-base mb-3">
          {tieneActiva ? 'Agregar / Acumular Plan' : 'Suscribir a Plan'}
        </h3>

        {errorPlanes && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-3">
            {errorPlanes}
            <button onClick={cargarDatos} className="ml-3 underline font-bold">Reintentar</button>
          </div>
        )}

        {cargandoPlanes ? (
          <div className="text-center py-8 text-gray-400 text-sm">Cargando planes disponibles...</div>
        ) : planes.length === 0 && !errorPlanes ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No hay planes de suscripción configurados para esta sucursal.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map(plan => (
              <div key={plan.id_tipo}
                className="rounded-lg border-2 border-gray-200 p-5 flex flex-col items-center text-center bg-white hover:border-[#ea580c] transition-colors">
                <p className="font-bold text-black text-sm mb-1">{plan.nombre}</p>
                <p className="font-black text-black text-2xl mb-1">
                  ${Number(plan.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </p>
                <p className="text-xs text-gray-500 mb-3">Vigencia: {plan.duracion_dias} días</p>
                <ul className="text-xs text-gray-600 text-left space-y-1 mb-4 w-full">
                  <li className="flex gap-1"><span>•</span>Acceso a todas las áreas</li>
                  {plan.limite_sesiones_nutriologo > 0 && (
                    <li className="flex gap-1"><span>•</span>{plan.limite_sesiones_nutriologo} sesiones con nutriólogo</li>
                  )}
                  {plan.limite_sesiones_entrenador > 0 && (
                    <li className="flex gap-1"><span>•</span>{plan.limite_sesiones_entrenador} sesiones con entrenador</li>
                  )}
                </ul>
                <button
                  onClick={() => handleSeleccionarPlan(plan)}
                  className="w-full bg-[#ea580c] text-white font-bold py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm">
                  {tieneActiva ? 'Acumular Plan' : 'Suscribir'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL TÉRMINOS */}
      {modalTerminos && planSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="font-bold text-black text-lg mb-1">Términos y Condiciones</h3>
            <p className="text-sm text-gray-500 mb-3">
              Plan: <span className="font-bold text-black">{planSeleccionado.nombre}</span> —&nbsp;
              ${Number(planSeleccionado.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
            <ul className="text-sm text-black space-y-1 mb-4 max-h-48 overflow-y-auto">
              {TERMINOS.map((t, i) => <li key={i} className="flex gap-2"><span>•</span>{t}</li>)}
            </ul>
            <label className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={aceptaTerminos}
                onChange={e => setAceptaTerminos(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]" />
              <span className="text-sm text-black">El usuario ha leído y acepta los términos y condiciones.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalTerminos(false)}
                className="text-gray-600 font-bold px-4 py-2 text-sm hover:text-black">Cancelar</button>
              <button onClick={handleContinuarPago} disabled={!aceptaTerminos}
                className={`font-bold px-6 py-2 rounded text-sm text-white transition-colors
                  ${aceptaTerminos ? 'bg-[#1e293b] hover:bg-[#0f172a]' : 'bg-gray-400 cursor-not-allowed'}`}>
                Continuar al Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {modalPago && planSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <h3 className="font-bold text-black text-xl mb-1">Procesar Pago</h3>
            <div className="border-t border-gray-200 my-3" />
            <p className="font-bold text-black text-base mb-1">{planSeleccionado.nombre}</p>
            <p className="font-black text-blue-600 text-3xl mb-1">
              ${Number(planSeleccionado.precio).toFixed(2)}
            </p>
            <p className="text-gray-400 text-xs mb-2">Vigencia: {planSeleccionado.duracion_dias} días</p>
            {tieneActiva && (
              <p className="text-orange-500 text-xs font-bold mb-4 bg-orange-50 rounded px-3 py-2">
                ⚡ Este plan se acumulará al vencimiento actual ({fmtFecha(vencimientoFinal!)}).
              </p>
            )}
            <div className="space-y-3">

              {/* Botón pago en caja */}
              <button onClick={handleConfirmarPago} disabled={procesando || procesandoMP}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {procesando ? 'Procesando...' : '💵 Confirmar Pago en Caja'}
              </button>

              {/* Separador */}
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <div className="flex-1 border-t border-gray-200" />
                <span>o pagar en línea</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Botón Mercado Pago */}
              <button
                onClick={handlePagarMercadoPago}
                disabled={procesandoMP || procesando}
                className="w-full font-bold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-white"
                style={{ backgroundColor: procesandoMP ? '#a0aec0' : '#009ee3' }}
              >
                {procesandoMP ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Redirigiendo a Mercado Pago...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="16" fill="white" fillOpacity="0.2"/>
                      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">MP</text>
                    </svg>
                    Pagar con Mercado Pago
                  </>
                )}
              </button>
            </div>
            <button onClick={() => setModalPago(false)} disabled={procesando || procesandoMP}
              className="mt-4 text-gray-400 text-sm hover:text-black disabled:opacity-40">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}