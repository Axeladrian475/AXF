import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import TabsBuscarSuscriptor from './tabs/TabsBuscarSuscriptor'
import TabsAdministrarSuscripcion from './tabs/TabsAdministrarSuscripcion'
import axiosClient from '../../api/axiosClient'

type Tab = 'buscar' | 'administrar'

const PAGO_PENDIENTE_KEY = 'axf_pago_pendiente'
const PAGO_MAX_AGE_MS    = 30 * 60 * 1000   // 30 minutos

export default function Suscripciones() {
  const location = useLocation()
  const navState = location.state as { id?: string; nombre?: string } | null

  // ── Leer suscriptor desde query params (?suscriptor=ID&nombre=NOMBRE) ──────
  // Esto permite que SuscriptoresLista y otros módulos naveguen directamente
  // al panel de administrar sin pasar por location.state
  const qParams      = new URLSearchParams(location.search)
  const qSuscriptor  = qParams.get('suscriptor')
  const qNombre      = qParams.get('nombre')

  // Resolver el suscriptor inicial: query params tienen prioridad sobre state
  const suscriptorInicial = qSuscriptor
    ? { id: qSuscriptor, nombre: decodeURIComponent(qNombre ?? `Suscriptor #${qSuscriptor}`) }
    : navState?.id
      ? { id: navState.id, nombre: navState.nombre ?? '' }
      : null

  const [tab, setTab] = useState<Tab>(suscriptorInicial ? 'administrar' : 'buscar')
  const [suscriptorActivo, setSuscriptorActivo] = useState<{ id: string; nombre: string } | null>(suscriptorInicial)
  const [cargandoRetorno, setCargandoRetorno] = useState(false)

  const handleGestionar = (id: string, nombre: string) => {
    setSuscriptorActivo({ id, nombre })
    setTab('administrar')
  }

  // ── Al montar: detectar pago pendiente/retorno de Mercado Pago ──────────────
  useEffect(() => {
    const params       = new URLSearchParams(window.location.search)
    const tipoPago     = params.get('pago')
    const suscriptorId = params.get('suscriptor')

    // ── Caso A: MP redirigió automáticamente con query params ────────────────
    if ((tipoPago === 'exitoso' || tipoPago === 'pendiente') && suscriptorId) {
      setCargandoRetorno(true)
      axiosClient.get(`/suscriptores/${suscriptorId}`)
        .then(({ data }) => {
          const nombre = `${data.nombres} ${data.apellido_paterno}`.trim()
          setSuscriptorActivo({ id: suscriptorId, nombre })
          setTab('administrar')
        })
        .catch(() => {
          setSuscriptorActivo({ id: suscriptorId, nombre: `Suscriptor #${suscriptorId}` })
          setTab('administrar')
        })
        .finally(() => setCargandoRetorno(false))
      return
    }

    // ── Caso B: Usuario regresó manualmente (sin query params) ───────────────
    // Verificar si hay un pago pendiente guardado en localStorage
    const raw = localStorage.getItem(PAGO_PENDIENTE_KEY)
    if (!raw) return

    try {
      const pendiente = JSON.parse(raw) as {
        external_reference: string
        id_suscriptor: string
        plan_nombre: string
        ts: number
      }

      // Ignorar si tiene más de 30 minutos (seguridad)
      const edad = Date.now() - pendiente.ts
      if (edad > PAGO_MAX_AGE_MS) {
        localStorage.removeItem(PAGO_PENDIENTE_KEY)
        return
      }

      // Cargar suscriptor y activar verificación
      setCargandoRetorno(true)
      axiosClient.get(`/suscriptores/${pendiente.id_suscriptor}`)
        .then(({ data }) => {
          const nombre = `${data.nombres} ${data.apellido_paterno}`.trim()
          setSuscriptorActivo({ id: pendiente.id_suscriptor, nombre })
          setTab('administrar')
        })
        .catch(() => {
          setSuscriptorActivo({ id: pendiente.id_suscriptor, nombre: `Suscriptor #${pendiente.id_suscriptor}` })
          setTab('administrar')
        })
        .finally(() => setCargandoRetorno(false))

    } catch {
      localStorage.removeItem(PAGO_PENDIENTE_KEY)
    }
  }, [])

  return (
    <div className="p-4">
      <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('buscar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'buscar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Buscar Suscriptor
          </button>
          <button onClick={() => setTab('administrar')}
            className={`px-6 py-2 rounded-full font-bold text-sm border-2 transition-all ${tab === 'administrar' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-black hover:bg-gray-100'}`}>
            Administrar Suscripción
          </button>
        </div>

        {/* Spinner de carga al detectar pago pendiente */}
        {cargandoRetorno && (
          <div className="flex flex-col items-center gap-4 justify-center py-16">
            <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-bold text-gray-800 text-sm">Verificando pago con Mercado Pago...</p>
              <p className="text-gray-500 text-xs mt-1">Espera un momento mientras confirmamos tu suscripción.</p>
            </div>
          </div>
        )}

        {!cargandoRetorno && tab === 'buscar' && (
          <TabsBuscarSuscriptor onGestionar={handleGestionar} />
        )}
        {!cargandoRetorno && tab === 'administrar' && suscriptorActivo && (
          <TabsAdministrarSuscripcion
            suscriptorId={suscriptorActivo.id}
            suscriptorNombre={suscriptorActivo.nombre}
          />
        )}
        {!cargandoRetorno && tab === 'administrar' && !suscriptorActivo && (
          <div className="text-center py-8 text-gray-500">
            <p className="font-bold">Selecciona un suscriptor desde "Buscar Suscriptor"</p>
          </div>
        )}
      </div>
    </div>
  )
}