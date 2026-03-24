// ============================================================================
//  pages/usuarios/tabs/TabsRegistrarNuevo.tsx
//  Formulario de registro — integración ESP32 via polling HTTP
//
//  Flujo de captura biométrica:
//  1. Personal presiona "Leer NFC" o "Escanear Huella"
//  2. Se llama POST /api/hardware/token → devuelve token de 8 chars
//  3. Se muestra modal con: TOKEN:XXXX  y  MODO:nfc / MODO:huella
//  4. Frontend hace polling a GET /api/hardware/poll/:token cada 2s
//  5. Cuando ESP32 envía el dato → campo se autocompleta → modal cierra
// ============================================================================

import { useState, useContext, useEffect, useRef } from 'react'
import { Eye, EyeOff, Loader2 }                     from 'lucide-react'
import { AuthContext }                               from '../../../context/AuthContext'
import axiosClient                                   from '../../../api/axiosClient'

type AlertaTipo = 'exito' | 'error' | 'info'
type AlertaState = { tipo: AlertaTipo; mensaje: string } | null
type TokenSesion = { token: string; tipo: 'nfc' | 'huella' } | null

function Alerta({ tipo, mensaje, onClose }: { tipo: AlertaTipo; mensaje: string; onClose: () => void }) {
  const cls = { exito: 'bg-green-50 border-green-400 text-green-800', error: 'bg-red-50 border-red-400 text-red-800', info: 'bg-blue-50 border-blue-400 text-blue-800' }[tipo]
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold mb-4 ${cls}`}>
      <span>{mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  )
}

function ModalToken({ token, tipo, onCancelar }: { token: string; tipo: 'nfc' | 'huella'; onCancelar: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="text-4xl mb-3">{tipo === 'nfc' ? '💳' : '👆'}</div>
        <h3 className="text-lg font-bold text-black mb-2">{tipo === 'nfc' ? 'Leer Tarjeta NFC' : 'Escanear Huella'}</h3>
        <p className="text-sm text-gray-600 mb-4">Escribe estos comandos en el <strong>Serial Monitor</strong> del Arduino IDE:</p>
        <div className="space-y-2 mb-5">
          <div className="bg-gray-900 text-green-400 font-mono text-lg rounded-lg px-4 py-3 select-all">TOKEN:{token}</div>
          <div className="bg-gray-900 text-green-400 font-mono text-lg rounded-lg px-4 py-3 select-all">MODO:{tipo}</div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-5">
          <Loader2 size={16} className="animate-spin text-[#ea580c]" />
          Esperando lectura del ESP32... (60s)
        </div>
        <button onClick={onCancelar} className="text-sm text-gray-400 hover:text-gray-600 underline">Cancelar</button>
      </div>
    </div>
  )
}

const SEXO_MAP: Record<string, string> = { Masculino: 'M', Femenino: 'F', Otro: 'Otro' }
const FORM_VACIO = { nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', sexo: 'Masculino', telefono: '', direccion: '', codigo_postal: '', correo: '', password: '', nfc_uid: '', huella_id: '' }

export default function TabsRegistrarNuevo() {
  const { user }                        = useContext(AuthContext)
  const [form, setForm]                 = useState(FORM_VACIO)
  const [showPass, setShowPass]         = useState(false)
  const [enviando, setEnviando]         = useState(false)
  const [alerta, setAlerta]             = useState<AlertaState>(null)
  const [tokenSesion, setTokenSesion]   = useState<TokenSesion>(null)
  const [esperandoHw, setEsperandoHw]   = useState(false)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef                      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const terminos_aceptados = true

  useEffect(() => {
    if (!tokenSesion) {
      if (pollRef.current)   clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }
    setEsperandoHw(true)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axiosClient.get(`/hardware/poll/${tokenSesion.token}`)
        if (data.listo) {
          clearInterval(pollRef.current!)
          clearTimeout(timeoutRef.current!)
          setTokenSesion(null)
          setEsperandoHw(false)
          if (data.tipo === 'nfc') {
            setForm(p => ({ ...p, nfc_uid: data.valor }))
            setAlerta({ tipo: 'exito', mensaje: `✅ Tarjeta NFC leída: ${data.valor}` })
          } else {
            setForm(p => ({ ...p, huella_id: data.valor }))
            setAlerta({ tipo: 'exito', mensaje: `✅ Huella registrada en sensor (posición ${data.valor})` })
          }
        }
      } catch { /* silencioso */ }
    }, 2000)
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current!)
      setTokenSesion(null)
      setEsperandoHw(false)
      setAlerta({ tipo: 'error', mensaje: 'Tiempo agotado — el ESP32 no respondió. Intenta de nuevo.' })
    }, 75000)
    return () => { clearInterval(pollRef.current!); clearTimeout(timeoutRef.current!) }
  }, [tokenSesion])

  const iniciarLectura = async (tipo: 'nfc' | 'huella') => {
    setAlerta(null)
    try {
      const { data } = await axiosClient.post('/hardware/token', { tipo })
      setTokenSesion({ token: data.token, tipo })
    } catch {
      setAlerta({ tipo: 'error', mensaje: 'Error al generar token. Verifica que el backend esté corriendo.' })
    }
  }

  const cancelarLectura = () => { setTokenSesion(null); setEsperandoHw(false) }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const limpiarFormulario = () => { setForm(FORM_VACIO); setShowPass(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAlerta(null)
    if (!form.nombres.trim() || !form.apellido_paterno.trim()) return setAlerta({ tipo: 'error', mensaje: 'Nombres y Apellido Paterno son obligatorios.' })
    if (!form.correo.trim()) return setAlerta({ tipo: 'error', mensaje: 'El correo electrónico es obligatorio.' })
    if (form.password.length < 6) return setAlerta({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres.' })
    if (!form.fecha_nacimiento) return setAlerta({ tipo: 'error', mensaje: 'La fecha de nacimiento es obligatoria.' })
    setEnviando(true)
    try {
      const { data } = await axiosClient.post('/suscriptores', {
        nombres: form.nombres.trim(), apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento, sexo: SEXO_MAP[form.sexo] ?? 'M',
        telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null,
        codigo_postal: form.codigo_postal.trim() || null, correo: form.correo.trim(),
        password: form.password, terminos_aceptados,
        nfc_uid: form.nfc_uid || null,
        huella_template: form.huella_id || null,
      })
      setAlerta({ tipo: 'exito', mensaje: data.message ?? 'Suscriptor registrado correctamente.' })
      limpiarFormulario()
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: err?.response?.data?.message ?? 'Error al registrar.' })
    } finally { setEnviando(false) }
  }

  const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c] disabled:opacity-60'

  return (
    <div>
      {tokenSesion && <ModalToken token={tokenSesion.token} tipo={tokenSesion.tipo} onCancelar={cancelarLectura} />}
      <h2 className="text-xl font-bold text-black mb-5">Registrar Nuevo Suscriptor</h2>
      {alerta && <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-bold text-black mb-1">Nombres <span className="text-red-500">*</span></label><input name="nombres" value={form.nombres} onChange={handleChange} disabled={enviando} placeholder="Ej. Juan Alberto" className={inputCls} /></div>
          <div><label className="block text-sm font-bold text-black mb-1">Apellido Paterno <span className="text-red-500">*</span></label><input name="apellido_paterno" value={form.apellido_paterno} onChange={handleChange} disabled={enviando} placeholder="Ej. Pérez" className={inputCls} /></div>
          <div><label className="block text-sm font-bold text-black mb-1">Apellido Materno</label><input name="apellido_materno" value={form.apellido_materno} onChange={handleChange} disabled={enviando} placeholder="Ej. López" className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-bold text-black mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label><input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} disabled={enviando} className={inputCls} /></div>
          <div><label className="block text-sm font-bold text-black mb-1">Sexo</label><select name="sexo" value={form.sexo} onChange={handleChange} disabled={enviando} className={inputCls}><option>Masculino</option><option>Femenino</option><option>Otro</option></select></div>
          <div><label className="block text-sm font-bold text-black mb-1">Teléfono</label><input name="telefono" value={form.telefono} onChange={handleChange} disabled={enviando} placeholder="10 dígitos" maxLength={20} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><label className="block text-sm font-bold text-black mb-1">Dirección</label><input name="direccion" value={form.direccion} onChange={handleChange} disabled={enviando} placeholder="Calle, Número, Colonia" className={inputCls} /></div>
          <div><label className="block text-sm font-bold text-black mb-1">Código Postal</label><input name="codigo_postal" value={form.codigo_postal} onChange={handleChange} disabled={enviando} placeholder="Ej. 44100" maxLength={10} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-bold text-black mb-1">Correo Electrónico <span className="text-red-500">*</span></label><input type="email" name="correo" value={form.correo} onChange={handleChange} disabled={enviando} placeholder="usuario@email.com" className={inputCls} /></div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Contraseña <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} disabled={enviando} placeholder="Mínimo 6 caracteres" className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div><label className="block text-sm font-bold text-black mb-1">Sucursal (Asignada Automáticamente)</label><input readOnly value={user?.nombre_sucursal ?? 'AxF Centro'} className="w-full bg-gray-200 border border-gray-300 rounded px-3 py-2 text-black text-sm cursor-not-allowed" /></div>
        </div>

        {/* Control de acceso ESP32 */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="font-bold text-sm text-black mb-3">Control de Acceso — ESP32</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">UID Tarjeta NFC</label>
              <div className="flex gap-2">
                <input readOnly value={form.nfc_uid} placeholder="Sin leer" className={`flex-1 bg-white border rounded px-3 py-2 text-sm text-black ${form.nfc_uid ? 'border-green-400 bg-green-50' : 'border-gray-300'}`} />
                {form.nfc_uid && <button type="button" onClick={() => setForm(p => ({ ...p, nfc_uid: '' }))} className="text-gray-400 hover:text-red-500 text-xs px-2">✕</button>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Posición Huella en Sensor</label>
              <div className="flex gap-2">
                <input readOnly value={form.huella_id} placeholder="Sin registrar" className={`flex-1 bg-white border rounded px-3 py-2 text-sm text-black ${form.huella_id ? 'border-green-400 bg-green-50' : 'border-gray-300'}`} />
                {form.huella_id && <button type="button" onClick={() => setForm(p => ({ ...p, huella_id: '' }))} className="text-gray-400 hover:text-red-500 text-xs px-2">✕</button>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" disabled={enviando || esperandoHw} onClick={() => iniciarLectura('nfc')}
              className="flex items-center gap-2 border-2 border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-bold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <span>💳</span> Leer Tarjeta NFC
            </button>
            <button type="button" disabled={enviando || esperandoHw} onClick={() => iniciarLectura('huella')}
              className="flex items-center gap-2 border-2 border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/10 font-bold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <span>👆</span> Escanear Huella
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Al presionar se genera un código que debes escribir en el Serial Monitor del ESP32.</p>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={enviando} className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
            {enviando && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {enviando ? 'Registrando...' : 'Registrar Suscriptor'}
          </button>
        </div>
      </form>
    </div>
  )
}
