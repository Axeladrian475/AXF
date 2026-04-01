import { useState, useEffect, useCallback } from 'react'
import {
  getSuscripciones,
  getSuscripcionActiva,
  suscribirSuscriptor,
  type TipoSuscripcion,
  type SuscripcionActiva,
  type SuscripcionItem,
} from '../../../api/suscripcionesApi'
import { crearOrdenPago, confirmarPago } from '../../../api/pagosApi'

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
  suscriptorId:     string
  suscriptorNombre: string
}

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function BarraPeriodo({ inicio, fin }: { inicio: string; fin: string }) {
  const hoy   = Date.now()
  const start = new Date(inicio.slice(0, 10)).getTime()
  const end   = new Date(fin.slice(0, 10)).getTime()
  const pct   = Math.min(100, Math.max(0, Math.round(((hoy - start) / (end - start)) * 100)))
  const dias  = Math.max(0, Math.ceil((end - hoy) / 86_400_000))
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{fmtFecha(inicio)}</span>
        <span className="font-bold text-white">{dias} días restantes</span>
        <span>{fmtFecha(fin)}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TarjetaSuscripcion({ sub, index, esCorriendo }: {
  sub: SuscripcionItem; index: number; esCorriendo: boolean
}) {
  return (
    <div className={`rounded-lg border-2 px-4 py-3 flex gap-3 items-start
      ${esCorriendo ? 'border-green-400 bg-[#162032]' : 'border-gray-600 bg-[#1e293b]'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5
        ${esCorriendo ? 'bg-green-400 text-[#1e293b]' : 'bg-gray-600 text-gray-300'}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black text-white text-sm">{sub.plan_nombre}</p>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full
            ${esCorriendo ? 'bg-green-400 text-[#1e293b]' : 'bg-orange-500 text-white'}`}>
            {esCorriendo ? 'EN CURSO' : 'ACUMULADA'}
          </span>
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

export default function TabsAdministrarSuscripcion({ suscriptorId, suscriptorNombre }: Props) {
  const [planes,         setPlanes]         = useState<TipoSuscripcion[]>([])
  const [estadoActivo,   setEstadoActivo]   = useState<SuscripcionActiva | null>(null)
  const [cargandoPlanes, setCargandoPlanes] = useState(true)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [errorPlanes,    setErrorPlanes]    = useState<string | null>(null)

  const [planSeleccionado, setPlanSeleccionado] = useState<TipoSuscripcion | null>(null)
  const [modalTerminos,    setModalTerminos]    = useState(false)
  const [modalPago,        setModalPago]        = useState(false)
  const [aceptaTerminos,   setAceptaTerminos]   = useState(false)

  const [procesandoCaja,    setProcesandoCaja]    = useState(false)
  const [procesandoPayPal,  setProcesandoPayPal]  = useState(false)
  const [confirmandoPago,   setConfirmandoPago]   = useState(false)

  const [pagoOk, setPagoOk] = useState<{ plan_nombre: string; fecha_fin: string } | null>(null)
  const [toast,  setToast]  = useState<{ tipo: 'ok' | 'err' | 'info'; msg: string } | null>(null)

  const mostrarToast = (tipo: 'ok' | 'err' | 'info', msg: string) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 6000)
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
      setErrorPlanes('No se pudieron cargar los datos.')
    } finally {
      setCargandoPlanes(false)
      setCargandoEstado(false)
    }
  }, [suscriptorId])

  // ── Al montar: ver si venimos del redirect de PayPal ─────────────────────────
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const tipoPago = params.get('pago')
    const token    = params.get('token')   // order_id que PayPal devuelve
    const sus      = params.get('sus')
    const tipo     = params.get('tipo')

    if (tipoPago === 'exitoso' && token && sus && tipo) {
      window.history.replaceState({}, '', window.location.pathname)
      setConfirmandoPago(true)

      confirmarPago(token, sus, tipo)
        .then((result) => {
          if (result.ok && result.suscripcion) {
            setPagoOk({
              plan_nombre: result.suscripcion.plan_nombre,
              fecha_fin:   result.suscripcion.fecha_fin,
            })
            cargarDatos()
          } else {
            mostrarToast('err', `❌ ${result.message ?? 'No se pudo confirmar el pago.'}`)
          }
        })
        .catch((err) => {
          console.error('[Pago] Error al confirmar:', err)
          mostrarToast('err', '❌ Error al confirmar el pago con el servidor.')
        })
        .finally(() => setConfirmandoPago(false))

    } else if (tipoPago === 'cancelado') {
      window.history.replaceState({}, '', window.location.pathname)
      mostrarToast('info', '⚠️ El pago fue cancelado en PayPal.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargarDatos() }, [suscriptorId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Pago en caja ─────────────────────────────────────────────────────────────
  const handlePagarCaja = async () => {
    if (!planSeleccionado) return
    setProcesandoCaja(true)
    try {
      const res = await suscribirSuscriptor(Number(suscriptorId), {
        id_tipo: planSeleccionado.id_tipo,
      })
      setModalPago(false)
      mostrarToast('ok',
        res.acumulada
          ? `✅ Plan acumulado hasta ${fmtFecha(res.fecha_fin)}.`
          : `✅ Suscripción activa hasta ${fmtFecha(res.fecha_fin)}.`
      )
      cargarDatos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al procesar la suscripción.'
      mostrarToast('err', msg)
    } finally {
      setProcesandoCaja(false)
    }
  }

  // ── Pago con PayPal ──────────────────────────────────────────────────────────
  const handlePagarPayPal = async () => {
    if (!planSeleccionado) return
    setProcesandoPayPal(true)
    try {
      const data = await crearOrdenPago({
        id_suscriptor: Number(suscriptorId),
        id_tipo:       planSeleccionado.id_tipo,
      })
      // Redirigir a PayPal en la misma pestaña
      window.location.href = data.approve_url
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al conectar con PayPal.'
      mostrarToast('err', `❌ ${msg}`)
      setProcesandoPayPal(false)
    }
  }

  const tieneActiva      = estadoActivo?.activa
  const subs             = estadoActivo?.suscripciones ?? []
  const vigente          = estadoActivo?.vigente
  const totales          = estadoActivo?.totales
  const vencimientoFinal = estadoActivo?.vencimiento_final

  const toastColor = toast?.tipo === 'ok' ? 'bg-green-600'
    : toast?.tipo === 'info' ? 'bg-blue-600' : 'bg-red-600'

  return (
    <div className="space-y-5 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-bold max-w-sm ${toastColor}`}>
          {toast.msg}
        </div>
      )}

      {/* Banner: confirmando pago (al volver de PayPal) */}
      {confirmandoPago && (
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="font-bold text-sm">Confirmando pago con PayPal...</p>
        </div>
      )}

      {/* Banner: pago exitoso */}
      {pagoOk && (
        <div className="bg-green-600 text-white rounded-xl p-5">
          <p className="font-black text-lg">✅ ¡Pago acreditado!</p>
          <p className="text-sm mt-1">
            Plan <strong>{pagoOk.plan_nombre}</strong> activo hasta <strong>{fmtFecha(pagoOk.fecha_fin)}</strong>.
          </p>
          <button
            onClick={() => setPagoOk(null)}
            className="mt-3 bg-white text-green-700 font-black px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* INFO SUSCRIPTOR */}
      <div className="border border-gray-300 rounded-lg px-5 py-4 bg-white">
        <p className="font-black text-xl text-black">{suscriptorNombre}</p>
        <p className="text-gray-500 text-sm">ID: SUS-{String(suscriptorId).padStart(5, '0')}</p>
      </div>

      {/* ESTADO SUSCRIPCIÓN */}
      {cargandoEstado ? (
        <div className="bg-gray-100 rounded-lg px-5 py-6 text-center text-gray-400 text-sm">
          Cargando estado de suscripción...
        </div>
      ) : tieneActiva && vigente ? (
        <div className="bg-[#1e293b] text-white rounded-lg px-5 py-4 space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-bold text-green-400 text-sm">✅ Estado: ACTIVA</p>
              <p className="text-gray-400 text-xs mt-1">Vencimiento final:</p>
              <p className="font-black text-green-400 text-2xl">{fmtFecha(vencimientoFinal!)}</p>
            </div>
            <div className="flex gap-3">
              {(totales?.sesiones_nutriologo ?? 0) > 0 && (
                <div className="bg-[#0f172a] rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <p className="text-2xl">🥗</p>
                  <p className="font-black text-white text-xl">{totales!.sesiones_nutriologo}</p>
                  <p className="text-gray-400 text-xs">nutriólogo</p>
                </div>
              )}
              {(totales?.sesiones_entrenador ?? 0) > 0 && (
                <div className="bg-[#0f172a] rounded-lg px-4 py-2 text-center min-w-[90px]">
                  <p className="text-2xl">🏋️</p>
                  <p className="font-black text-white text-xl">{totales!.sesiones_entrenador}</p>
                  <p className="text-gray-400 text-xs">entrenador</p>
                </div>
              )}
            </div>
          </div>
          <BarraPeriodo inicio={vigente.fecha_inicio} fin={vigente.fecha_fin} />
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              {subs.length} suscripción{subs.length !== 1 ? 'es' : ''} comprada{subs.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {subs.map((s, i) => (
                <TarjetaSuscripcion key={s.id_suscripcion} sub={s} index={i} esCorriendo={i === 0} />
              ))}
            </div>
          </div>
          {subs.length > 1 && (
            <p className="text-gray-400 text-xs border-t border-gray-700 pt-2">
              ℹ Las suscripciones acumuladas se activan automáticamente al vencer la anterior.
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
          <div className="text-center py-8 text-gray-400 text-sm">Cargando planes...</div>
        ) : planes.length === 0 && !errorPlanes ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No hay planes configurados para esta sucursal.
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
              {/* Pago en caja */}
              <button
                onClick={handlePagarCaja}
                disabled={procesandoCaja || procesandoPayPal}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {procesandoCaja ? 'Procesando...' : '💵 Confirmar Pago en Caja'}
              </button>

              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <div className="flex-1 border-t border-gray-200" />
                <span>o pagar en línea</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Pago con PayPal */}
              <button
                onClick={handlePagarPayPal}
                disabled={procesandoPayPal || procesandoCaja}
                className="w-full font-bold py-3 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-white"
                style={{ backgroundColor: '#003087' }}>
                {procesandoPayPal ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Redirigiendo a PayPal...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .92-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.773-4.471z"/>
                    </svg>
                    Pagar con PayPal
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setModalPago(false)}
              disabled={procesandoCaja || procesandoPayPal}
              className="mt-4 text-gray-400 text-sm hover:text-black disabled:opacity-40">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
