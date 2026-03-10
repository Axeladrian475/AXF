import { useState } from 'react'

const PLANES = [
  { id: 1, nombre: 'Mensual Básica',      precio: 500,  desc: ['Acceso a todas las áreas', 'Vigencia 30 dias'] },
  { id: 2, nombre: 'Anual Completa',       precio: 4500, desc: ['Acceso Total + Lockers', 'Vigencia 365 días', 'Congelamiento (15 días)'], destacado: true },
  { id: 3, nombre: 'Promoción Estudiante', precio: 350,  desc: ['Horario Restringido', 'Requiere Credencial'] },
]

const TERMINOS = [
  'Definición y Alcance del Servicio: Acceso a instalaciones y equipos.',
  'Registro y Gestión de Cuentas: Datos verídicos obligatorios.',
  'Seguridad de Datos y Privacidad: Protección conforme a la ley.',
  'Condiciones de Pago: Pago único en exhibición.',
  'Propiedad Intelectual y Licencias: Uso de marca AxF.',
  'Terminación de la Suscripción: Reglas de cancelación.',
  'Limitación de Responsabilidad e Indemnización: Uso bajo propio riesgo.',
]

interface Props { suscriptorId: string; suscriptorNombre: string }

export default function TabsAdministrarSuscripcion({ suscriptorId, suscriptorNombre }: Props) {
  const [planSeleccionado, setPlanSeleccionado] = useState<typeof PLANES[0] | null>(null)
  const [modalTerminos, setModalTerminos] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  const handlePagarEnCaja = (plan: typeof PLANES[0]) => {
    setPlanSeleccionado(plan)
    setModalTerminos(true)
    setAceptaTerminos(false)
  }

  const handleContinuarPago = () => {
    if (!aceptaTerminos) return
    setModalTerminos(false)
    setModalPago(true)
  }

  return (
    <div className="space-y-5">
      {/* INFO SUSCRIPTOR */}
      <div className="flex items-start justify-between border border-gray-300 rounded-lg px-5 py-4 bg-white">
        <div>
          <p className="font-black text-xl text-black">{suscriptorNombre}</p>
          <p className="text-gray-500 text-sm">ID: {suscriptorId} | Sucursal AxF Centro</p>
        </div>
        <button className="border border-gray-300 text-black text-xs font-bold px-4 py-2 rounded hover:bg-gray-100">
          Cancelar Suscripción Actual
        </button>
      </div>

      {/* ESTADO ACTIVO */}
      <div className="bg-[#1e293b] text-white rounded-lg px-5 py-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-green-400 flex items-center gap-2"><span>✅</span> Estado: ACTIVA</p>
            <p className="text-gray-400 text-xs mt-1">Inicio del periodo continuo:</p>
            <p className="font-black text-white text-lg">16/06/2025</p>
          </div>
          <div className="text-right">
            <span className="bg-[#ea580c] text-white text-xs font-bold px-3 py-1 rounded-full">ACCESO FUSIONADO (ACUMULADO)</span>
            <p className="text-gray-400 text-xs mt-2">Vencimiento final (Total):</p>
            <p className="font-black text-green-400 text-lg">15/07/2026</p>
          </div>
        </div>
        <div className="mt-3 border-t border-gray-600 pt-3">
          <p className="text-gray-300 text-xs">
            ℹ Detalle de Acumulación: Suscripción Mensual (15/07/25) + Suscripción Anual Agregada. El acceso es válido ininterrumpidamente hasta 2026.
          </p>
        </div>
      </div>

      {/* PLANES */}
      <div>
        <h3 className="font-bold text-black text-base mb-3">Comprar / Renovar Plan</h3>
        <div className="grid grid-cols-3 gap-4">
          {PLANES.map(plan => (
            <div key={plan.id}
              className={`rounded-lg border-2 p-5 flex flex-col items-center text-center bg-white
                ${plan.destacado ? 'border-[#ea580c]' : 'border-gray-200'}`}>
              <p className="font-bold text-black text-sm mb-1">{plan.nombre}</p>
              <p className="font-black text-black text-2xl mb-3">${plan.precio.toLocaleString()} MXN</p>
              <ul className="text-xs text-gray-600 text-left space-y-1 mb-4 w-full">
                {plan.desc.map((d, i) => <li key={i} className="flex gap-1"><span>•</span>{d}</li>)}
              </ul>
              <button
                onClick={() => handlePagarEnCaja(plan)}
                className="w-full bg-[#ea580c] text-white font-bold py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm">
                Pagar en Caja
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL TÉRMINOS */}
      {modalTerminos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="font-bold text-black text-lg mb-3">Términos y Condiciones del Servicio</h3>
            <p className="text-sm text-black mb-3">Para proceder con la inscripción, el usuario debe aceptar los siguientes puntos:</p>
            <ul className="text-sm text-black space-y-1 mb-4">
              {TERMINOS.map((t, i) => <li key={i} className="flex gap-2"><span>•</span>{t}</li>)}
            </ul>
            <label className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)} className="w-4 h-4 accent-[#ea580c]" />
              <span className="text-sm text-black">El usuario ha leído y acepta los términos y condiciones.</span>
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalTerminos(false)}
                className="text-gray-600 font-bold px-4 py-2 text-sm hover:text-black">Cancelar</button>
              <button onClick={handleContinuarPago}
                disabled={!aceptaTerminos}
                className={`font-bold px-6 py-2 rounded text-sm text-white transition-colors ${aceptaTerminos ? 'bg-[#1e293b] hover:bg-[#0f172a]' : 'bg-gray-400 cursor-not-allowed'}`}>
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
            <p className="font-black text-blue-600 text-3xl mb-2">${planSeleccionado.precio.toFixed(2)}</p>
            <p className="text-gray-400 text-xs mb-5">Seleccione método en terminal o enlace digital.</p>
            <button className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
              <span>💳</span> Pagar con Mercado Pago
            </button>
            <button onClick={() => setModalPago(false)}
              className="mt-3 text-gray-400 text-sm hover:text-black">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
