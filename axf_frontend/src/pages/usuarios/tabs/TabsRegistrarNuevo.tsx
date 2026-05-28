// ============================================================================
//  pages/usuarios/tabs/TabsRegistrarNuevo.tsx
//  Formulario de registro — integración ESP32 (NFC + Huella dactilar)
//
//  Flujo de captura NFC / Huella (v6 — SSE):
//  1. Personal presiona "Leer NFC" o "Escanear Huella"
//  2. Se llama POST /api/hardware/token → devuelve token
//  3. Se abre un EventSource a GET /api/hardware/sse/:token
//  4. El ESP32 recoge el token y reporta pasos → llegan en ~0ms vía SSE
//  5. Al completar → campo se autocompleta → modal cierra
// ============================================================================

import { useState, useContext, useEffect, useRef } from 'react'
import { Eye, EyeOff, Loader2, Wifi, RefreshCw, CheckCircle, Camera, X, Fingerprint } from 'lucide-react'
import { AuthContext }  from '../../../context/AuthContext'
import axiosClient      from '../../../api/axiosClient'
import { validarPassword } from '../../../utils/passwordValidator'
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator'

// ─── Tipos ──────────────────────────────────────────────────────────────────
type AlertaTipo = 'exito' | 'error' | 'info'
type AlertaState = { tipo: AlertaTipo; mensaje: string } | null
type EstadoHw = 'idle' | 'pending' | 'reading' | 'done' | 'error'
type TipoHw = 'nfc' | 'huella'

interface SesionHw {
  token: string
  tipo: TipoHw
  estado: EstadoHw
  paso: string
}

// ─── Mapa de pasos NFC ───────────────────────────────────────────────────────
const PASOS_NFC: Record<string, { texto: string; icono: string; color: string }> = {
  esperando_dispositivo: { texto: 'Conectando con el dispositivo ESP32...', icono: '📡', color: 'text-blue-500' },
  listo_para_leer:       { texto: 'Acerca la tarjeta NFC al lector',        icono: '💳', color: 'text-orange-500' },
  acerca_tarjeta:        { texto: 'Acerca la tarjeta NFC al lector',        icono: '💳', color: 'text-orange-500' },
  tarjeta_detectada:     { texto: 'Tarjeta detectada ✓ Enviando datos...',  icono: '✅', color: 'text-green-500' },
  enviando:              { texto: 'Guardando datos en el servidor...',       icono: '📤', color: 'text-blue-500' },
  completado:            { texto: 'NFC registrado correctamente',            icono: '✅', color: 'text-green-600' },
}

// ─── Mapa de pasos Huella ────────────────────────────────────────────────────
const PASOS_HUELLA: Record<string, { texto: string; icono: string; color: string }> = {
  esperando_dispositivo: { texto: 'Conectando con el dispositivo ESP32...', icono: '📡', color: 'text-blue-500' },
  listo_para_leer:       { texto: 'Coloca el dedo en el sensor...',         icono: '👆', color: 'text-orange-500' },
  acerca_dedo_1:         { texto: 'Coloca el dedo en el sensor (1/2)',      icono: '👆', color: 'text-orange-500' },
  dedo_1_ok:             { texto: 'Primera toma ✓',                         icono: '✅', color: 'text-green-500' },
  retira_dedo:           { texto: 'Retira el dedo del sensor...',           icono: '✋', color: 'text-yellow-500' },
  acerca_dedo_2:         { texto: 'Coloca el dedo de nuevo (2/2)',          icono: '👆', color: 'text-orange-500' },
  dedo_2_ok:             { texto: 'Segunda toma ✓',                         icono: '✅', color: 'text-green-500' },
  creando_modelo:        { texto: 'Procesando huellas...',                  icono: '⚙️', color: 'text-blue-500' },
  guardando:             { texto: 'Guardando en el sensor...',              icono: '💾', color: 'text-blue-500' },
  enviando:              { texto: 'Guardando datos en el servidor...',      icono: '📤', color: 'text-blue-500' },
  completado:            { texto: 'Huella registrada correctamente',        icono: '✅', color: 'text-green-600' },
}

const MENSAJES_ERROR: Record<string, string> = {
  timeout_nfc:            'No se detectó ninguna tarjeta NFC (tiempo agotado). Intenta de nuevo.',
  timeout_dedo_1:         'No se detectó el dedo en la primera toma. Intenta de nuevo.',
  timeout_dedo_2:         'No se detectó el dedo en la segunda toma. Intenta de nuevo.',
  huellas_no_coinciden:   'Las dos tomas no coinciden. Coloca el mismo dedo ambas veces.',
  error_imagen_1:         'Error al procesar la primera imagen. Intenta de nuevo.',
  error_imagen_2:         'Error al procesar la segunda imagen. Intenta de nuevo.',
  error_modelo:           'Error al crear el modelo de huella. Intenta de nuevo.',
  error_guardado:         'Error al guardar en el sensor. Intenta de nuevo.',
  error_red:              'El ESP32 no pudo comunicarse con el servidor.',
  cancelado_por_frontend: 'Operación cancelada.',
  timeout_general:        'La operación tardó demasiado. Intenta de nuevo.',
  error_desconocido:      'Error desconocido. Intenta de nuevo.',
}

// ─── Componente: Alerta simple ───────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: { tipo: AlertaTipo; mensaje: string; onClose: () => void }) {
  const cls = {
    exito: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info:  'bg-blue-50 border-blue-400 text-blue-800',
  }[tipo]
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold mb-4 ${cls}`}>
      <span>{mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  )
}

// ─── Componente: Modal Hardware (NFC o Huella) ───────────────────────────────
function ModalHardware({
  sesion,
  onCancelar,
  onReintentar,
}: {
  sesion: SesionHw
  onCancelar: () => void
  onReintentar: () => void
}) {
  const esNFC    = sesion.tipo === 'nfc'
  const pasoMap  = esNFC ? PASOS_NFC : PASOS_HUELLA
  const infoStep = pasoMap[sesion.paso] ?? { texto: sesion.paso, icono: '⏳', color: 'text-gray-500' }

  const esError      = sesion.estado === 'error'
  const esCompletado = sesion.estado === 'done' || sesion.paso === 'completado'
  const esPending    = sesion.estado === 'pending'

  const mensajeError = MENSAJES_ERROR[sesion.paso] ?? MENSAJES_ERROR['error_desconocido']

  // Pasos de progreso visual
  const pasosProgresoNFC = [
    { key: 'acerca_tarjeta',    label: 'Acercar' },
    { key: 'tarjeta_detectada', label: 'Detectada' },
    { key: 'enviando',          label: 'Guardar' },
  ]
  const pasosProgresoHuella = [
    { key: 'acerca_dedo_1', label: 'Toma 1' },
    { key: 'acerca_dedo_2', label: 'Toma 2' },
    { key: 'creando_modelo', label: 'Procesar' },
    { key: 'enviando',       label: 'Guardar' },
  ]
  const pasosProgreso = esNFC ? pasosProgresoNFC : pasosProgresoHuella
  const pasoKeys      = Object.keys(pasoMap)

  const titulo = esNFC ? 'Registro de Tarjeta NFC' : 'Registro de Huella Dactilar'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-6 pt-6 pb-4 text-center ${esError ? 'bg-red-50' : esCompletado ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="text-5xl mb-2">
            {esError ? '❌' : esCompletado ? '✅' : infoStep.icono}
          </div>
          <h3 className="text-lg font-bold text-black">{titulo}</h3>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5">

          {/* Estado del paso actual */}
          {!esError && (
            <div className={`text-center text-base font-semibold mb-4 ${infoStep.color}`}>
              {esCompletado ? (
                <span className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle size={18} /> {infoStep.texto}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#ea580c]" />
                  {infoStep.texto}
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {esError && (
            <div className="text-center mb-4">
              <p className="text-red-600 font-semibold text-sm mb-1">⚠️ Ocurrió un error</p>
              <p className="text-gray-600 text-sm">{mensajeError}</p>
            </div>
          )}

          {/* Barra de progreso visual */}
          {!esError && !esPending && (
            <div className="flex items-center justify-between mb-5 px-2">
              {pasosProgreso.map((p, i) => {
                const idxActual = pasoKeys.indexOf(sesion.paso)
                const idxRef    = pasoKeys.indexOf(p.key)
                const activo    = idxActual >= idxRef
                const esUltimo  = i === pasosProgreso.length - 1
                return (
                  <div key={p.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                        ${activo ? 'bg-[#ea580c] text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {activo ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs mt-1 ${activo ? 'text-[#ea580c] font-semibold' : 'text-gray-400'}`}>
                        {p.label}
                      </span>
                    </div>
                    {!esUltimo && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 transition-colors
                        ${activo ? 'bg-[#ea580c]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Indicador ESP32 pending */}
          {esPending && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
              <Wifi size={13} className="text-[#ea580c]" />
              El dispositivo ESP32 está buscando la tarea automáticamente...
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            {esError && (
              <button
                onClick={onReintentar}
                className="flex items-center justify-center gap-2 w-full bg-[#ea580c] text-white font-bold py-2.5 rounded-lg hover:bg-[#c94a0a] transition-colors text-sm"
              >
                <RefreshCw size={15} /> Intentar de nuevo
              </button>
            )}
            {!esCompletado && (
              <button
                onClick={onCancelar}
                className="w-full text-sm text-gray-400 hover:text-gray-700 py-1 underline transition-colors"
              >
                {esError ? 'Cancelar' : 'Cancelar proceso'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Form vacío ──────────────────────────────────────────────────────────────
const SEXO_MAP: Record<string, string> = { Masculino: 'M', Femenino: 'F', Otro: 'Otro' }
const FORM_VACIO = {
  nombres: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', sexo: 'Masculino', telefono: '',
  direccion: '', codigo_postal: '', correo: '', password: '',
  nfc_uid: '', huella_id: '',
}

// ─── Componente: Vista previa de foto ────────────────────────────────────────
function FotoPreview({ archivo, onQuitar }: { archivo: File | null; onQuitar: () => void }) {
  const url = archivo ? URL.createObjectURL(archivo) : null
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-28 h-28 rounded-full border-4 overflow-hidden flex items-center justify-center
        ${archivo ? 'border-[#ea580c]' : 'border-dashed border-gray-300 bg-gray-50'}`}>
        {url ? (
          <>
            <img src={url} alt="preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onQuitar}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
              title="Quitar foto"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <Camera size={28} className="text-gray-300" />
        )}
      </div>
      <span className={`text-xs font-bold ${archivo ? 'text-green-600' : 'text-red-500'}`}>
        {archivo ? `✅ ${archivo.name.slice(0, 22)}${archivo.name.length > 22 ? '…' : ''}` : '⚠️ Foto obligatoria'}
      </span>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function TabsRegistrarNuevo() {
  const { user }                = useContext(AuthContext)
  const [form, setForm]         = useState(FORM_VACIO)
  const [showPass, setShowPass] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [alerta, setAlerta]     = useState<AlertaState>(null)
  const [sesionHw, setSesionHw] = useState<SesionHw | null>(null)
  const [foto, setFoto]         = useState<File | null>(null)
  const fotoInputRef            = useRef<HTMLInputElement>(null)

  // Ref que guarda la función para cerrar el EventSource activo
  const sseCleanupRef = useRef<(() => void) | null>(null)

  // Cerrar SSE al desmontar el componente
  useEffect(() => () => { sseCleanupRef.current?.() }, [])

  // ── Escuchar estado vía SSE ────────────────────────────────────────────────
  function iniciarSSE(token: string) {
    // Cerrar cualquier SSE anterior
    sseCleanupRef.current?.()

    const baseURL = (axiosClient.defaults.baseURL ?? '').replace(/\/$/, '')
    const jwt = localStorage.getItem('token') ?? ''
    const url = `${baseURL}/hardware/sse/${token}?jwt=${jwt}`
    const es = new EventSource(url)

    // Timeout de 90s (huella necesita más tiempo por las dos tomas)
    const timeoutId = setTimeout(() => {
      es.close()
      sseCleanupRef.current = null
      setSesionHw(prev => prev ? { ...prev, estado: 'error', paso: 'timeout_general' } : null)
    }, 90000)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.estado === 'done') {
          clearTimeout(timeoutId)
          es.close()
          sseCleanupRef.current = null

          if (data.tipo === 'nfc') {
            setForm(p => ({ ...p, nfc_uid: data.valor }))
          } else if (data.tipo === 'huella' || data.tipo === 'huella_enroll') {
            setForm(p => ({ ...p, huella_id: data.valor }))
          }

          setSesionHw(prev => prev ? { ...prev, estado: 'done', paso: 'completado' } : null)
          const etiqueta = (data.tipo === 'nfc')
            ? `Tarjeta NFC: ${data.valor}`
            : `Huella en posición: ${data.valor}`
          // Cerrar el modal rápido (600ms): el valor ya está guardado en el form
          setTimeout(() => {
            setSesionHw(null)
            setAlerta({ tipo: 'exito', mensaje: `✅ ${etiqueta}` })
          }, 600)

        } else if (data.estado === 'error') {
          clearTimeout(timeoutId)
          es.close()
          sseCleanupRef.current = null
          setSesionHw(prev => prev ? { ...prev, estado: 'error', paso: data.paso } : null)

        } else {
          // estado intermedio: reading / pending
          setSesionHw(prev => prev ? { ...prev, estado: data.estado as EstadoHw, paso: data.paso } : null)
        }
      } catch { /* ignorar frames mal formados */ }
    }

    es.onerror = () => {
      clearTimeout(timeoutId)
      es.close()
      sseCleanupRef.current = null
      setSesionHw(prev => prev ? { ...prev, estado: 'error', paso: 'error_red' } : null)
    }

    sseCleanupRef.current = () => {
      clearTimeout(timeoutId)
      es.close()
    }
  }

  // ── Iniciar lectura NFC ────────────────────────────────────────────────────
  const iniciarLecturaNFC = async () => {
    setAlerta(null)
    try {
      const { data } = await axiosClient.post('/hardware/token', { tipo: 'nfc' })
      setSesionHw({ token: data.token, tipo: 'nfc', estado: 'pending', paso: 'esperando_dispositivo' })
      iniciarSSE(data.token)
    } catch {
      setAlerta({ tipo: 'error', mensaje: 'Error al iniciar. Verifica que el backend esté corriendo.' })
    }
  }

  // ── Iniciar lectura Huella ─────────────────────────────────────────────────
  const iniciarLecturaHuella = async () => {
    setAlerta(null)
    try {
      const { data } = await axiosClient.post('/hardware/token', { tipo: 'huella_enroll' })
      setSesionHw({ token: data.token, tipo: 'huella', estado: 'pending', paso: 'esperando_dispositivo' })
      iniciarSSE(data.token)
    } catch {
      setAlerta({ tipo: 'error', mensaje: 'Error al iniciar. Verifica que el backend esté corriendo.' })
    }
  }

  // ── Cancelar lectura ───────────────────────────────────────────────────────
  const cancelarLectura = async () => {
    if (!sesionHw) return
    sseCleanupRef.current?.()
    sseCleanupRef.current = null
    try {
      await axiosClient.post('/hardware/cancelar', {
        api_key: 'axf_esp32_2025',
        token_sesion: sesionHw.token,
        motivo: 'cancelado_por_frontend',
      })
    } catch { /* silencioso */ }
    setSesionHw(null)
  }

  // ── Reintentar ─────────────────────────────────────────────────────────────
  const reintentar = async () => {
    const tipoAnterior = sesionHw?.tipo ?? 'nfc'
    // Cerrar SSE anterior
    sseCleanupRef.current?.()
    sseCleanupRef.current = null
    // Cancelar en el backend para liberar el token (evita que el ESP32 lo procese)
    if (sesionHw) {
      try {
        await axiosClient.post('/hardware/cancelar', {
          api_key: 'axf_esp32_2025',
          token_sesion: sesionHw.token,
          motivo: 'cancelado_por_frontend',
        })
      } catch { /* silencioso */ }
    }
    setSesionHw(null)
    // Iniciar directamente sin setTimeout — React procesa el setState en batch
    if (tipoAnterior === 'huella') iniciarLecturaHuella()
    else iniciarLecturaNFC()
  }

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const limpiarFormulario = () => { setForm(FORM_VACIO); setShowPass(false); setFoto(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAlerta(null)
    if (!form.nombres.trim() || !form.apellido_paterno.trim())
      return setAlerta({ tipo: 'error', mensaje: 'Nombres y Apellido Paterno son obligatorios.' })
    if (!form.correo.trim())
      return setAlerta({ tipo: 'error', mensaje: 'El correo electrónico es obligatorio.' })
    const errPass = validarPassword(form.password, form.correo)
    if (errPass)
      return setAlerta({ tipo: 'error', mensaje: errPass })
    if (!form.fecha_nacimiento)
      return setAlerta({ tipo: 'error', mensaje: 'La fecha de nacimiento es obligatoria.' })
    if (!foto)
      return setAlerta({ tipo: 'error', mensaje: 'La foto del suscriptor es obligatoria.' })

    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('foto', foto)
      fd.append('nombres',          form.nombres.trim())
      fd.append('apellido_paterno', form.apellido_paterno.trim())
      fd.append('apellido_materno', form.apellido_materno.trim() || '')
      fd.append('fecha_nacimiento', form.fecha_nacimiento)
      fd.append('sexo',             SEXO_MAP[form.sexo] ?? 'M')
      fd.append('telefono',         form.telefono.trim())
      fd.append('direccion',        form.direccion.trim())
      fd.append('codigo_postal',    form.codigo_postal.trim())
      fd.append('correo',           form.correo.trim())
      fd.append('password',         form.password)
      fd.append('terminos_aceptados', '1')
      if (form.nfc_uid)   fd.append('nfc_uid',   form.nfc_uid)
      if (form.huella_id) fd.append('huella_template', form.huella_id)

      const { data } = await axiosClient.post('/suscriptores', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAlerta({ tipo: 'exito', mensaje: data.message ?? 'Suscriptor registrado correctamente.' })
      limpiarFormulario()
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al registrar.' })
    } finally {
      setEnviando(false)
    }
  }

  const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c] disabled:opacity-60'
  const esperandoHw = sesionHw !== null

  return (
    <div>
      {/* Modal Hardware (NFC o Huella) */}
      {sesionHw && (
        <ModalHardware
          sesion={sesionHw}
          onCancelar={cancelarLectura}
          onReintentar={reintentar}
        />
      )}

      <h2 className="text-xl font-bold text-black mb-5">Registrar Nuevo Suscriptor</h2>
      {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

      <form className="space-y-4" onSubmit={handleSubmit}>

        {/* ── Foto del suscriptor (OBLIGATORIA) ─────────────────────────── */}
        <div className="border-2 border-dashed rounded-xl p-5 bg-gray-50 flex items-center gap-6"
          style={{ borderColor: foto ? '#ea580c' : '#e5e7eb' }}>
          <FotoPreview archivo={foto} onQuitar={() => setFoto(null)} />
          <div className="flex-1">
            <p className="font-bold text-black text-sm mb-1">
              Foto del Suscriptor <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Sube una foto clara del rostro. Formatos: JPG, PNG, WebP. Máx. 5 MB.
            </p>
            <button
              type="button"
              disabled={enviando}
              onClick={() => fotoInputRef.current?.click()}
              className="flex items-center gap-2 border-2 border-[#ea580c] text-[#ea580c] font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#ea580c]/10 transition-colors disabled:opacity-50"
            >
              <Camera size={15} />
              {foto ? 'Cambiar foto' : 'Seleccionar foto'}
            </button>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setFoto(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* Nombre */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Nombres <span className="text-red-500">*</span></label>
            <input name="nombres" value={form.nombres} onChange={handleChange} disabled={enviando} placeholder="Ej. Juan Alberto" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
            <input name="apellido_paterno" value={form.apellido_paterno} onChange={handleChange} disabled={enviando} placeholder="Ej. Pérez" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Materno</label>
            <input name="apellido_materno" value={form.apellido_materno} onChange={handleChange} disabled={enviando} placeholder="Ej. López" className={inputCls} />
          </div>
        </div>

        {/* Datos personales */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
            <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} disabled={enviando} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sexo</label>
            <select name="sexo" value={form.sexo} onChange={handleChange} disabled={enviando} className={inputCls}>
              <option>Masculino</option><option>Femenino</option><option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} disabled={enviando} placeholder="10 dígitos" maxLength={20} className={inputCls} />
          </div>
        </div>

        {/* Dirección */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-black mb-1">Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} disabled={enviando} placeholder="Calle, Número, Colonia" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Código Postal</label>
            <input name="codigo_postal" value={form.codigo_postal} onChange={handleChange} disabled={enviando} placeholder="Ej. 44100" maxLength={10} className={inputCls} />
          </div>
        </div>

        {/* Acceso */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
            <input type="email" name="correo" value={form.correo} onChange={handleChange} disabled={enviando} placeholder="usuario@email.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Contraseña <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} disabled={enviando} placeholder="Mínimo 8 caracteres" className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthIndicator password={form.password} usuario={form.correo} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sucursal (Asignada Automáticamente)</label>
            <input readOnly value={user?.nombre_sucursal ?? 'AxF Centro'} className="w-full bg-gray-200 border border-gray-300 rounded px-3 py-2 text-black text-sm cursor-not-allowed" />
          </div>
        </div>

        {/* ── Control de Acceso: NFC + Huella ───────────────────────────── */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="font-bold text-sm text-black mb-1">Control de Acceso</p>
          <p className="text-xs text-gray-400 mb-4">
            Registra la tarjeta NFC y/o la huella dactilar del suscriptor. El dispositivo se activa automáticamente al presionar el botón.
          </p>

          <div className="flex flex-col gap-4">

            {/* ── NFC ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 mb-1">UID Tarjeta NFC</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={form.nfc_uid}
                    placeholder="Sin leer"
                    className={`flex-1 bg-white border rounded px-3 py-2 text-sm text-black ${form.nfc_uid ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                  />
                  {form.nfc_uid && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, nfc_uid: '' }))} className="text-gray-400 hover:text-red-500 text-xs px-2">✕</button>
                  )}
                </div>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  disabled={enviando || esperandoHw}
                  onClick={iniciarLecturaNFC}
                  className={`flex items-center gap-2 border-2 font-bold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${form.nfc_uid
                      ? 'border-green-500 text-green-600 hover:bg-green-50'
                      : 'border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10'}`}
                >
                  <span>💳</span>
                  {form.nfc_uid ? 'Re-leer NFC' : 'Leer Tarjeta NFC'}
                </button>
              </div>
            </div>

            {/* ── Huella ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 mb-1">Huella Dactilar (posición en sensor)</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={form.huella_id ? `Posición #${form.huella_id}` : ''}
                    placeholder="Sin registrar"
                    className={`flex-1 bg-white border rounded px-3 py-2 text-sm text-black ${form.huella_id ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                  />
                  {form.huella_id && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, huella_id: '' }))} className="text-gray-400 hover:text-red-500 text-xs px-2">✕</button>
                  )}
                </div>
              </div>
              <div className="pt-5">
                <button
                  type="button"
                  disabled={enviando || esperandoHw}
                  onClick={iniciarLecturaHuella}
                  className={`flex items-center gap-2 border-2 font-bold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${form.huella_id
                      ? 'border-green-500 text-green-600 hover:bg-green-50'
                      : 'border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10'}`}
                >
                  <Fingerprint size={15} />
                  {form.huella_id ? 'Re-registrar Huella' : 'Escanear Huella'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enviando && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {enviando ? 'Registrando...' : 'Registrar Suscriptor'}
          </button>
        </div>
      </form>
    </div>
  )
}