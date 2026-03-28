// ============================================================================
//  pages/usuarios/tabs/TabsDirectorioDeUsuarios.tsx
//  Directorio de suscriptores — con modal de modificar completo
//  Incluye re-registro biométrico (NFC/Huella) con guía paso a paso
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle, RefreshCw, X } from 'lucide-react'
import axiosClient from '../../../api/axiosClient'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Suscriptor {
  id_suscriptor:     number
  id_publico:        string
  nombre_completo:   string
  correo:            string
  telefono:          string | null
  sucursal_registro: string
}

interface SuscriptorDetalle {
  id_suscriptor:    number
  nombres:          string
  apellido_paterno: string
  apellido_materno: string | null
  fecha_nacimiento: string
  sexo:             string
  telefono:         string | null
  direccion:        string | null
  codigo_postal:    string | null
  correo:           string
  tiene_nfc:        number   // 0 | 1
  tiene_huella:     number   // 0 | 1
  sucursal_registro: string
}

type EstadoHw = 'idle' | 'pending' | 'reading' | 'done' | 'error'
type TipoLectura = 'nfc' | 'huella'

interface SesionHw {
  token:  string
  tipo:   TipoLectura
  estado: EstadoHw
  paso:   string
}

// ─── Mapas de pasos biométricos ───────────────────────────────────────────────
const PASOS_NFC: Record<string, { texto: string; icono: string; color: string }> = {
  esperando_dispositivo: { texto: 'Conectando con el dispositivo ESP32...', icono: '📡', color: 'text-blue-500' },
  listo_para_leer:       { texto: 'Acerca la tarjeta NFC al lector',        icono: '💳', color: 'text-orange-500' },
  acerca_tarjeta:        { texto: 'Acerca la tarjeta NFC al lector',        icono: '💳', color: 'text-orange-500' },
  tarjeta_detectada:     { texto: 'Tarjeta detectada ✓ Enviando datos...',  icono: '✅', color: 'text-green-500' },
  enviando:              { texto: 'Guardando datos en el servidor...',       icono: '📤', color: 'text-blue-500' },
  completado:            { texto: 'NFC actualizado correctamente',           icono: '✅', color: 'text-green-600' },
}
const PASOS_HUELLA: Record<string, { texto: string; icono: string; color: string }> = {
  esperando_dispositivo: { texto: 'Conectando con el dispositivo ESP32...', icono: '📡', color: 'text-blue-500' },
  listo_para_leer:       { texto: 'Coloca el dedo en el sensor de huella',  icono: '👆', color: 'text-orange-500' },
  acerca_dedo_1:         { texto: 'Coloca el dedo en el sensor (1ª toma)',  icono: '👆', color: 'text-orange-500' },
  dedo_1_ok:             { texto: '1ª toma capturada ✓',                   icono: '✅', color: 'text-green-500' },
  retira_dedo:           { texto: 'Retira el dedo del sensor',              icono: '☝️', color: 'text-yellow-500' },
  acerca_dedo_2:         { texto: 'Vuelve a colocar el mismo dedo (2ª toma)',icono: '👆', color: 'text-orange-500' },
  dedo_2_ok:             { texto: '2ª toma capturada ✓',                   icono: '✅', color: 'text-green-500' },
  creando_modelo:        { texto: 'Procesando huella...',                   icono: '⚙️', color: 'text-blue-500' },
  guardando:             { texto: 'Guardando huella en sensor...',          icono: '💾', color: 'text-blue-500' },
  enviando:              { texto: 'Enviando datos al servidor...',          icono: '📤', color: 'text-blue-500' },
  completado:            { texto: 'Huella actualizada correctamente',       icono: '✅', color: 'text-green-600' },
}
const MENSAJES_ERROR: Record<string, string> = {
  timeout_nfc:          'No se detectó ninguna tarjeta NFC. Intenta de nuevo.',
  timeout_dedo_1:       'No se detectó el dedo (1ª toma). Intenta de nuevo.',
  timeout_dedo_2:       'No se detectó el dedo (2ª toma). Intenta de nuevo.',
  huellas_no_coinciden: 'Las dos tomas no coinciden. Usa el mismo dedo.',
  error_imagen_1:       'Error al procesar la 1ª toma. Intenta de nuevo.',
  error_imagen_2:       'Error al procesar la 2ª toma. Intenta de nuevo.',
  error_modelo:         'Error al crear el modelo. Intenta de nuevo.',
  error_guardado:       'Error al guardar en el sensor. Intenta de nuevo.',
  error_red:            'El ESP32 no pudo comunicarse con el servidor.',
  error_desconocido:    'Error desconocido. Intenta de nuevo.',
  cancelado_por_frontend: 'Operación cancelada.',
  timeout_general:      'Tiempo agotado. El ESP32 no respondió.',
}

// ─── Alerta ───────────────────────────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: { tipo: 'exito' | 'error'; mensaje: string; onClose: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold mb-4
      ${tipo === 'exito' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800'}`}>
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  )
}

// ─── Modal biométrico (igual que en TabsRegistrarNuevo) ───────────────────────
function ModalBiometrico({ sesion, onCancelar, onReintentar }: {
  sesion: SesionHw
  onCancelar: () => void
  onReintentar: () => void
}) {
  const pasosMapa  = sesion.tipo === 'nfc' ? PASOS_NFC : PASOS_HUELLA
  const infoStep   = pasosMapa[sesion.paso] ?? { texto: sesion.paso, icono: '⏳', color: 'text-gray-500' }
  const esError    = sesion.estado === 'error'
  const esCompletado = sesion.estado === 'done' || sesion.paso === 'completado'
  const esPending  = sesion.estado === 'pending'
  const mensajeError = MENSAJES_ERROR[sesion.paso] ?? MENSAJES_ERROR['error_desconocido']

  const pasosProgreso = sesion.tipo === 'huella'
    ? [{ key: 'acerca_dedo_1', label: '1ª toma' }, { key: 'retira_dedo', label: 'Retira' },
       { key: 'acerca_dedo_2', label: '2ª toma' }, { key: 'guardando',   label: 'Guardar' }]
    : [{ key: 'acerca_tarjeta', label: 'Acercar' }, { key: 'tarjeta_detectada', label: 'Detectada' },
       { key: 'enviando',       label: 'Enviar' }]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className={`px-6 pt-6 pb-4 text-center ${esError ? 'bg-red-50' : esCompletado ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="text-5xl mb-2">{esError ? '❌' : esCompletado ? '✅' : infoStep.icono}</div>
          <h3 className="text-lg font-bold text-black">
            {sesion.tipo === 'nfc' ? 'Actualizar Tarjeta NFC' : 'Actualizar Huella Digital'}
          </h3>
        </div>
        <div className="px-6 py-5">
          {!esError && (
            <div className={`text-center text-base font-semibold mb-4 ${infoStep.color}`}>
              <span className="flex items-center justify-center gap-2">
                {esCompletado
                  ? <><CheckCircle size={18} /> {infoStep.texto}</>
                  : <><Loader2 size={16} className="animate-spin text-[#ea580c]" /> {infoStep.texto}</>}
              </span>
            </div>
          )}
          {esError && (
            <div className="text-center mb-4">
              <p className="text-red-600 font-semibold text-sm mb-1">⚠️ Ocurrió un error</p>
              <p className="text-gray-600 text-sm">{mensajeError}</p>
              <p className="text-xs text-gray-400 mt-1">El espacio en el sensor <strong>no fue ocupado</strong>. Puedes intentar de nuevo.</p>
            </div>
          )}
          {!esError && !esPending && (
            <div className="flex items-center justify-between mb-5 px-2">
              {pasosProgreso.map((p, i) => {
                const pasoKeys  = Object.keys(sesion.tipo === 'nfc' ? PASOS_NFC : PASOS_HUELLA)
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
                      <span className={`text-xs mt-1 ${activo ? 'text-[#ea580c] font-semibold' : 'text-gray-400'}`}>{p.label}</span>
                    </div>
                    {!esUltimo && <div className={`flex-1 h-0.5 mx-1 mb-4 ${activo ? 'bg-[#ea580c]' : 'bg-gray-200'}`} />}
                  </div>
                )
              })}
            </div>
          )}
          {esPending && (
            <p className="text-xs text-gray-400 text-center mb-4">El dispositivo ESP32 se activa automáticamente...</p>
          )}
          <div className="flex flex-col gap-2">
            {esError && (
              <button onClick={onReintentar}
                className="flex items-center justify-center gap-2 w-full bg-[#ea580c] text-white font-bold py-2.5 rounded-lg hover:bg-[#c94a0a] text-sm">
                <RefreshCw size={15} /> Intentar de nuevo
              </button>
            )}
            {!esCompletado && (
              <button onClick={onCancelar} className="w-full text-sm text-gray-400 hover:text-gray-700 py-1 underline">
                {esError ? 'Cancelar' : 'Cancelar proceso'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Modificar Suscriptor ───────────────────────────────────────────────
function ModalModificar({ suscriptorId, onCerrar, onGuardado }: {
  suscriptorId: number
  onCerrar: () => void
  onGuardado: (nombre: string) => void
}) {
  const [cargando, setCargando]       = useState(true)
  const [guardando, setGuardando]     = useState(false)
  const [alerta, setAlerta]           = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
  const [showPass, setShowPass]       = useState(false)
  const [sesionHw, setSesionHw]       = useState<SesionHw | null>(null)

  const [form, setForm] = useState({
    nombres: '', apellido_paterno: '', apellido_materno: '',
    fecha_nacimiento: '', sexo: 'M', telefono: '',
    direccion: '', codigo_postal: '', correo: '', password: '',
    nfc_uid: '', huella_id: '',
  })
  const [tieneNfc, setTieneNfc]       = useState(false)
  const [tieneHuella, setTieneHuella] = useState(false)

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  // ── Cargar datos del suscriptor ────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await axiosClient.get<SuscriptorDetalle>(`/suscriptores/${suscriptorId}`)
        setForm({
          nombres:          data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno ?? '',
          fecha_nacimiento: data.fecha_nacimiento?.split('T')[0] ?? '',
          sexo:             data.sexo,
          telefono:         data.telefono ?? '',
          direccion:        data.direccion ?? '',
          codigo_postal:    data.codigo_postal ?? '',
          correo:           data.correo,
          password:         '',
          nfc_uid:          '',
          huella_id:        '',
        })
        setTieneNfc(data.tiene_nfc === 1)
        setTieneHuella(data.tiene_huella === 1)
      } catch {
        setAlerta({ tipo: 'error', mensaje: 'No se pudieron cargar los datos del suscriptor.' })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [suscriptorId])

  // ── Polling biométrico ─────────────────────────────────────────
  useEffect(() => {
    if (!sesionHw || sesionHw.estado === 'done' || sesionHw.estado === 'error') {
      clearInterval(pollRef.current!)
      clearTimeout(timeoutRef.current!)
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axiosClient.get(`/hardware/poll/${sesionHw.token}`)
        if (data.estado === 'done') {
          clearInterval(pollRef.current!)
          clearTimeout(timeoutRef.current!)
          if (data.tipo === 'nfc') {
            setForm(p => ({ ...p, nfc_uid: data.valor }))
            setTieneNfc(true)
          } else {
            setForm(p => ({ ...p, huella_id: data.valor }))
            setTieneHuella(true)
          }
          setSesionHw(prev => prev ? { ...prev, estado: 'done', paso: 'completado' } : null)
          setTimeout(() => setSesionHw(null), 1500)
        } else if (data.estado === 'error') {
          clearInterval(pollRef.current!)
          clearTimeout(timeoutRef.current!)
          setSesionHw(prev => prev ? { ...prev, estado: 'error', paso: data.paso } : null)
        } else {
          setSesionHw(prev => prev ? { ...prev, estado: data.estado as EstadoHw, paso: data.paso } : null)
        }
      } catch { /* silencioso */ }
    }, 1500)
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!)
      setSesionHw(prev => prev ? { ...prev, estado: 'error', paso: 'timeout_general' } : null)
    }, 75000)
    return () => { clearInterval(pollRef.current!); clearTimeout(timeoutRef.current!) }
  }, [sesionHw?.token])

  const iniciarLectura = async (tipo: TipoLectura) => {
    try {
      const { data } = await axiosClient.post('/hardware/token', { tipo })
      setSesionHw({ token: data.token, tipo, estado: 'pending', paso: 'esperando_dispositivo' })
    } catch {
      setAlerta({ tipo: 'error', mensaje: 'Error al iniciar. Verifica que el backend esté corriendo.' })
    }
  }

  const cancelarLectura = async () => {
    if (!sesionHw) return
    clearInterval(pollRef.current!)
    clearTimeout(timeoutRef.current!)
    try {
      await axiosClient.post('/hardware/cancelar', {
        api_key: 'axf_esp32_2025',
        token_sesion: sesionHw.token,
        motivo: 'cancelado_por_frontend',
      })
    } catch { /* silencioso */ }
    setSesionHw(null)
  }

  const reintentar = async () => {
    if (!sesionHw) return
    const tipo = sesionHw.tipo
    setSesionHw(null)
    setTimeout(() => iniciarLectura(tipo), 100)
  }

  // ── Guardar cambios ────────────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)

    if (!form.nombres.trim() || !form.apellido_paterno.trim())
      return setAlerta({ tipo: 'error', mensaje: 'Nombres y Apellido Paterno son obligatorios.' })
    if (!form.correo.trim())
      return setAlerta({ tipo: 'error', mensaje: 'El correo es obligatorio.' })
    if (!form.fecha_nacimiento)
      return setAlerta({ tipo: 'error', mensaje: 'La fecha de nacimiento es obligatoria.' })

    setGuardando(true)
    try {
      const payload: Record<string, any> = {
        nombres:          form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento,
        sexo:             form.sexo,
        telefono:         form.telefono.trim() || null,
        direccion:        form.direccion.trim() || null,
        codigo_postal:    form.codigo_postal.trim() || null,
        correo:           form.correo.trim(),
      }
      if (form.password.trim()) payload.password = form.password.trim()
      if (form.nfc_uid)         payload.nfc_uid  = form.nfc_uid
      if (form.huella_id)       payload.huella_template = form.huella_id

      const { data } = await axiosClient.put(`/suscriptores/${suscriptorId}`, payload)
      onGuardado(`${form.nombres.trim()} ${form.apellido_paterno.trim()}`)
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al guardar.' })
      setGuardando(false)
    }
  }

  const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c] disabled:opacity-50'
  const esperandoHw = sesionHw !== null

  return (
    <>
      {/* Modal biométrico superpuesto */}
      {sesionHw && (
        <ModalBiometrico sesion={sesionHw} onCancelar={cancelarLectura} onReintentar={reintentar} />
      )}

      {/* Modal modificar */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-black">Modificar Suscriptor</h2>
            <button onClick={onCerrar} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto px-6 py-5 flex-1">
            {cargando ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin text-[#ea580c]" />
                Cargando datos...
              </div>
            ) : (
              <form id="form-modificar" onSubmit={handleGuardar} className="space-y-4">
                {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

                {/* Nombre */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Nombres <span className="text-red-500">*</span></label>
                    <input name="nombres" value={form.nombres}
                      onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))}
                      disabled={guardando} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
                    <input name="apellido_paterno" value={form.apellido_paterno}
                      onChange={e => setForm(p => ({ ...p, apellido_paterno: e.target.value }))}
                      disabled={guardando} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Apellido Materno</label>
                    <input name="apellido_materno" value={form.apellido_materno}
                      onChange={e => setForm(p => ({ ...p, apellido_materno: e.target.value }))}
                      disabled={guardando} className={inputCls} />
                  </div>
                </div>

                {/* Datos personales */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                    <input type="date" value={form.fecha_nacimiento}
                      onChange={e => setForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                      disabled={guardando} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Sexo</label>
                    <select value={form.sexo}
                      onChange={e => setForm(p => ({ ...p, sexo: e.target.value }))}
                      disabled={guardando} className={inputCls}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Teléfono</label>
                    <input value={form.telefono}
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                      disabled={guardando} placeholder="10 dígitos" maxLength={20} className={inputCls} />
                  </div>
                </div>

                {/* Dirección */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-black mb-1">Dirección</label>
                    <input value={form.direccion}
                      onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                      disabled={guardando} placeholder="Calle, Número, Colonia" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Código Postal</label>
                    <input value={form.codigo_postal}
                      onChange={e => setForm(p => ({ ...p, codigo_postal: e.target.value }))}
                      disabled={guardando} placeholder="Ej. 44100" maxLength={10} className={inputCls} />
                  </div>
                </div>

                {/* Acceso */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
                    <input type="email" value={form.correo}
                      onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
                      disabled={guardando} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">
                      Nueva Contraseña <span className="font-normal text-gray-400">(dejar vacío para no cambiar)</span>
                    </label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        disabled={guardando} placeholder="••••••••" className={`${inputCls} pr-10`} />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Biometría ESP32 ─────────────────────────────── */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="font-bold text-sm text-black mb-1">Control de Acceso — ESP32</p>
                  <p className="text-xs text-gray-400 mb-3">
                    Presiona el botón para actualizar la credencial biométrica del suscriptor.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* NFC */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Tarjeta NFC</label>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border text-xs
                          ${form.nfc_uid
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : tieneNfc
                              ? 'bg-blue-50 border-blue-300 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-400'}`}>
                          <span>💳</span>
                          {form.nfc_uid
                            ? <span className="font-mono font-bold truncate">{form.nfc_uid}</span>
                            : tieneNfc
                              ? <span>Tarjeta registrada</span>
                              : <span>Sin tarjeta</span>}
                        </div>
                        {form.nfc_uid && (
                          <button type="button" onClick={() => setForm(p => ({ ...p, nfc_uid: '' }))}
                            className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                        )}
                      </div>
                    </div>

                    {/* Huella */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Huella Digital</label>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border text-xs
                          ${form.huella_id
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : tieneHuella
                              ? 'bg-blue-50 border-blue-300 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-400'}`}>
                          <span>👆</span>
                          {form.huella_id
                            ? <span className="font-bold">Posición {form.huella_id} (nueva)</span>
                            : tieneHuella
                              ? <span>Huella registrada</span>
                              : <span>Sin huella</span>}
                        </div>
                        {form.huella_id && (
                          <button type="button" onClick={() => setForm(p => ({ ...p, huella_id: '' }))}
                            className="text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" disabled={guardando || esperandoHw}
                      onClick={() => iniciarLectura('nfc')}
                      className="flex items-center gap-2 border-2 border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-bold text-xs px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      💳 {tieneNfc || form.nfc_uid ? 'Actualizar NFC' : 'Registrar NFC'}
                    </button>
                    <button type="button" disabled={guardando || esperandoHw}
                      onClick={() => iniciarLectura('huella')}
                      className="flex items-center gap-2 border-2 border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-bold text-xs px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      👆 {tieneHuella || form.huella_id ? 'Actualizar Huella' : 'Registrar Huella'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer con acciones */}
          {!cargando && (
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
              <button type="button" onClick={onCerrar} disabled={guardando}
                className="px-5 py-2 border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" form="form-modificar" disabled={guardando || esperandoHw}
                className="flex items-center gap-2 px-6 py-2 bg-[#ea580c] text-white font-bold text-sm rounded-lg hover:bg-[#c94a0a] disabled:opacity-50 disabled:cursor-not-allowed">
                {guardando && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TabsDirectorioDeUsuarios() {
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([])
  const [busqueda,     setBusqueda]     = useState('')
  const [cargando,     setCargando]     = useState(true)
  const [eliminando,   setEliminando]   = useState<number | null>(null)
  const [alerta,       setAlerta]       = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
  const [modificandoId, setModificandoId] = useState<number | null>(null)

  const cargarSuscriptores = useCallback(async (q = '') => {
    setCargando(true)
    try {
      const { data } = await axiosClient.get<Suscriptor[]>('/suscriptores', { params: { q, limite: 100 } })
      setSuscriptores(data)
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al cargar los suscriptores.' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarSuscriptores() }, [cargarSuscriptores])

  const handleBuscar = () => cargarSuscriptores(busqueda)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBuscar()
  }

  const handleEliminar = async (s: Suscriptor) => {
    if (!window.confirm(`¿Deseas eliminar a "${s.nombre_completo}"?\n\nEsta acción desactivará su cuenta.`)) return
    setAlerta(null)
    setEliminando(s.id_suscriptor)
    try {
      const { data } = await axiosClient.delete<{ message: string }>(`/suscriptores/${s.id_suscriptor}`)
      setAlerta({ tipo: 'exito', mensaje: data.message ?? 'Suscriptor eliminado correctamente.' })
      setSuscriptores(prev => prev.filter(u => u.id_suscriptor !== s.id_suscriptor))
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al eliminar el suscriptor.' })
    } finally {
      setEliminando(null)
    }
  }

  const handleGuardado = (nombre: string) => {
    setModificandoId(null)
    setAlerta({ tipo: 'exito', mensaje: `✅ ${nombre} actualizado correctamente.` })
    cargarSuscriptores(busqueda)
  }

  return (
    <div>
      {/* Modal modificar */}
      {modificandoId !== null && (
        <ModalModificar
          suscriptorId={modificandoId}
          onCerrar={() => setModificandoId(null)}
          onGuardado={handleGuardado}
        />
      )}

      <h2 className="text-xl font-bold text-black mb-4">Gestión de Suscriptores</h2>

      {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

      {/* Búsqueda */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
          <span className="text-gray-400">🔍</span>
          <input type="text" placeholder="Buscar por Nombre, Apellido o ID..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 py-2 text-sm text-black bg-transparent outline-none" />
          {busqueda && (
            <button onClick={() => { setBusqueda(''); cargarSuscriptores('') }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        <button onClick={handleBuscar} disabled={cargando}
          className="bg-gray-700 text-white font-bold px-6 py-2 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
          Buscar
        </button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
          <span className="w-4 h-4 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
          Cargando suscriptores...
        </div>
      ) : suscriptores.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          {busqueda ? `No se encontraron suscriptores para "${busqueda}".` : 'No hay suscriptores registrados aún.'}
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Nombre Completo</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Correo Electrónico</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Teléfono</th>
              <th className="text-left font-bold text-black pb-2 pr-4">Sucursal (Registro)</th>
              <th className="text-left font-bold text-black pb-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {suscriptores.map(u => (
              <tr key={u.id_suscriptor} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 text-black font-mono text-xs">SUS-{u.id_publico}</td>
                <td className="py-3 pr-4 text-black font-bold">{u.nombre_completo}</td>
                <td className="py-3 pr-4 text-black">{u.correo}</td>
                <td className="py-3 pr-4 text-black">{u.telefono ?? '—'}</td>
                <td className="py-3 pr-4 text-black">{u.sucursal_registro}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModificandoId(u.id_suscriptor)}
                      className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                      Modificar
                    </button>
                    <button
                      onClick={() => handleEliminar(u)}
                      disabled={eliminando === u.id_suscriptor}
                      className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1">
                      {eliminando === u.id_suscriptor
                        ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : 'Eliminar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!cargando && suscriptores.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">
          {suscriptores.length} suscriptor{suscriptores.length !== 1 ? 'es' : ''} encontrado{suscriptores.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}