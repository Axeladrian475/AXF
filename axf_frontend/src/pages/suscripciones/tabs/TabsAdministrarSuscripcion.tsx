import { useState, useEffect } from 'react'
import {
  getSuscripciones,
  getSuscripcionActiva,
  suscribirSuscriptor,
  type TipoSuscripcion,
  type SuscripcionActiva,
  type SuscripcionItem,
} from '../../../api/suscripcionesApi'

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
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null)

  const mostrarToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const cargarDatos = async () => {
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
  }

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

  const tieneActiva      = estadoActivo?.activa
  const subs             = estadoActivo?.suscripciones ?? []
  const vigente          = estadoActivo?.vigente
  const totales          = estadoActivo?.totales
  const vencimientoFinal = estadoActivo?.vencimiento_final

  return (
    <div className="space-y-5 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-bold
          ${toast.tipo === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
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
            <div className="space-y-2">
              <button onClick={handleConfirmarPago} disabled={procesando}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {procesando ? 'Procesando...' : '✅ Confirmar Pago en Caja'}
              </button>
              <button disabled title="Próximamente disponible"
                className="w-full bg-blue-300 text-white font-bold py-3 rounded-lg cursor-not-allowed opacity-60 text-sm">
                💳 Pagar con Mercado Pago (próximamente)
              </button>
            </div>
            <button onClick={() => setModalPago(false)} disabled={procesando}
              className="mt-4 text-gray-400 text-sm hover:text-black">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}