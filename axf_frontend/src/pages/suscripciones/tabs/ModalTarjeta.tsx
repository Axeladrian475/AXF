// ============================================================================
//  ModalTarjeta.tsx
//  Modal de pago con tarjeta usando PayPal Card Fields (hosted fields).
//  El cliente NO necesita cuenta PayPal — ingresa número, expiración y CVV
//  directamente en iframes seguros de PayPal incrustados en este modal.
//
//  Flujo:
//    1. Se monta → carga el SDK de PayPal dinámicamente (una sola vez en el DOM)
//    2. Inicializa CardFields con createOrder → llama al backend
//    3. onApprove → llama a capturarOrden en el backend
//    4. Llama a onSuccess con plan_nombre y fecha_fin
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { crearOrdenPago, capturarOrden } from '../../../api/pagosApi'
import type { TipoSuscripcion } from '../../../api/suscripcionesApi'

// Declaración mínima de tipos para window.paypal
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any
  }
}

// ── Carga el SDK de PayPal una sola vez ──────────────────────────────────────
const PAYPAL_SDK_ATTR = 'data-axf-paypal-sdk'

function loadPayPalSDK(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return }

    const existing = document.querySelector(`script[${PAYPAL_SDK_ATTR}]`)
    if (existing) {
      existing.addEventListener('load',  () => resolve())
      existing.addEventListener('error', () => reject(new Error('Error cargando SDK PayPal')))
      return
    }

    const script = document.createElement('script')
    script.src = (
      `https://www.paypal.com/sdk/js` +
      `?client-id=${encodeURIComponent(clientId)}` +
      `&currency=MXN` +
      `&components=card-fields` +
      `&intent=capture` +
      `&disable-funding=venmo,paylater`
    )
    script.setAttribute(PAYPAL_SDK_ATTR, 'true')
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error('Error al cargar el módulo de pago con tarjeta'))
    document.head.appendChild(script)
  })
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  plan:              TipoSuscripcion
  suscriptorId:      number
  tieneActiva:       boolean
  es_promocion?:     boolean
  vencimientoFinal?: string
  fmtFecha:          (iso: string) => string
  onSuccess:         (planNombre: string, fechaFin: string) => void
  onError:           (msg: string) => void
  onClose:           () => void
}

// ── Spinner inline ───────────────────────────────────────────────────────────
function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-current ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ModalTarjeta({
  plan, suscriptorId, tieneActiva, es_promocion, vencimientoFinal,
  fmtFecha, onSuccess, onError, onClose,
}: Props) {

  const [fase,       setFase]       = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [cardError,  setCardError]  = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)

  // Refs para los contenedores de los iframes de PayPal
  const numberRef = useRef<HTMLDivElement>(null)
  const expiryRef = useRef<HTMLDivElement>(null)
  const cvvRef    = useRef<HTMLDivElement>(null)
  // Ref para la instancia de CardFields (permite llamar .submit())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardFieldsRef = useRef<any>(null)

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string

  // ── Cargar SDK y montar campos ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    loadPayPalSDK(clientId)
      .then(() => {
        if (cancelled) return
        setFase('listo')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setErrorMsg(err.message)
        setFase('error')
      })

    return () => { cancelled = true }
  }, [clientId])

  // ── Inicializar Card Fields cuando el SDK está listo y los divs montados ───
  useEffect(() => {
    if (fase !== 'listo') return
    if (!window.paypal?.CardFields) {
      setErrorMsg('El módulo de Card Fields no está disponible.')
      setFase('error')
      return
    }
    if (cardFieldsRef.current) return  // Ya inicializado

    const fields = window.paypal.CardFields({
      // createOrder: el SDK llama esto cuando el usuario hace submit
      createOrder: async () => {
        const data = await crearOrdenPago({
          id_suscriptor: suscriptorId,
          id_tipo:       es_promocion ? undefined : plan.id_tipo,
          id_promocion:  es_promocion ? plan.id_tipo : undefined,
        })
        return data.order_id
      },

      // onApprove: PayPal aprobó el pago con la tarjeta
      onApprove: async ({ orderID }: { orderID: string }) => {
        setProcesando(true)
        try {
          const result = await capturarOrden({
            order_id:      orderID,
            id_suscriptor: suscriptorId,
            id_tipo:       es_promocion ? undefined : plan.id_tipo,
            id_promocion:  es_promocion ? plan.id_tipo : undefined,
          })
          if (result.ok && result.suscripcion) {
            onSuccess(result.suscripcion.plan_nombre, result.suscripcion.fecha_fin)
          } else {
            onError(result.message ?? 'No se pudo confirmar el pago.')
            onClose()
          }
        } catch {
          onError('Error al confirmar el pago con el servidor.')
          onClose()
        } finally {
          setProcesando(false)
        }
      },

      onError: (err: unknown) => {
        console.error('[PayPal CardFields] onError', err)
        setCardError('Error al procesar la tarjeta. Verifica los datos e intenta de nuevo.')
        setProcesando(false)
      },

      // Estilo de los inputs dentro de los iframes
      style: {
        input: {
          'font-size':    '15px',
          'font-family':  'ui-sans-serif, system-ui, sans-serif',
          color:          '#111827',
          padding:        '0 4px',
          'line-height':  '44px',
        },
        '.invalid':  { color: '#dc2626' },
        '.valid':    { color: '#111827' },
      },
    })

    if (!fields.isEligible()) {
      setErrorMsg('El pago con tarjeta no está disponible en este momento para esta región o divisa.')
      setFase('error')
      return
    }

    // Montar los tres campos en los divs correspondientes
    if (numberRef.current) fields.NumberField({ placeholder: '1234 5678 9012 3456' }).render(numberRef.current)
    if (expiryRef.current) fields.ExpiryField({ placeholder: 'MM / AA' }).render(expiryRef.current)
    if (cvvRef.current)    fields.CVVField({    placeholder: 'CVV'     }).render(cvvRef.current)

    cardFieldsRef.current = fields
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handlePagar = async () => {
    if (!cardFieldsRef.current || procesando) return
    setCardError(null)
    setProcesando(true)
    try {
      // submit() dispara la validación → createOrder → aprobación con tarjeta → onApprove
      await cardFieldsRef.current.submit()
    } catch (err: unknown) {
      // submit() rechaza si la validación falla (campos vacíos/inválidos)
      const msg = (err instanceof Error) ? err.message : 'Datos de tarjeta inválidos. Revisa los campos.'
      console.error('[CardFields submit]', err)
      setCardError(msg)
      setProcesando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">

        {/* Encabezado */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-black text-lg flex items-center gap-2">
              💳 Pagar con Tarjeta
            </h3>
            <p className="text-gray-500 text-sm mt-0.5">
              {plan.nombre}&nbsp;—&nbsp;
              <span className="font-bold text-black">
                ${Number(plan.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={procesando}
            className="text-gray-400 hover:text-black disabled:opacity-40 text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">

          {/* Banner: acumulación */}
          {tieneActiva && vencimientoFinal && (
            <p className="text-orange-500 text-xs font-bold mb-4 bg-orange-50 rounded-lg px-3 py-2">
              ⚡ Este plan se acumulará al vencimiento actual ({fmtFecha(vencimientoFinal)}).
            </p>
          )}

          {/* Estado: error de SDK */}
          {fase === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm text-center">
              <p className="font-bold mb-1">No se pudo cargar el formulario</p>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Estado: cargando SDK */}
          {fase === 'cargando' && (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-400 text-sm">
              <Spinner className="h-5 w-5" />
              Cargando formulario de pago seguro...
            </div>
          )}

          {/* Estado: listo — campos de tarjeta */}
          {fase === 'listo' && (
            <div className="space-y-4">

              {/* Número de tarjeta */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Número de tarjeta
                </label>
                <div
                  ref={numberRef}
                  className="border border-gray-300 rounded-lg bg-white h-11 px-3 focus-within:border-[#003087] transition-colors"
                />
              </div>

              {/* Expiración + CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Expiración
                  </label>
                  <div
                    ref={expiryRef}
                    className="border border-gray-300 rounded-lg bg-white h-11 px-3 focus-within:border-[#003087] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    CVV
                  </label>
                  <div
                    ref={cvvRef}
                    className="border border-gray-300 rounded-lg bg-white h-11 px-3 focus-within:border-[#003087] transition-colors"
                  />
                </div>
              </div>

              {/* Error de tarjeta */}
              {cardError && (
                <p className="text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ❌ {cardError}
                </p>
              )}

              {/* Botón pagar */}
              <button
                onClick={handlePagar}
                disabled={procesando}
                className="w-full bg-[#003087] hover:bg-[#002060] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {procesando ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Procesando pago...
                  </>
                ) : (
                  <>
                    🔒 Pagar ${Number(plan.precio).toFixed(2)} MXN
                  </>
                )}
              </button>

              {/* Sello de seguridad */}
              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <span>Pago seguro procesado por</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#003087" className="w-12 h-3">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .92-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.773-4.471z"/>
                </svg>
              </p>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
