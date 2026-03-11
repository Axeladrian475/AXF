// ============================================================================
//  pages/usuarios/tabs/TabsRegistrarNuevo.tsx
//  Formulario de registro de nuevo suscriptor — conectado al backend real.
// ============================================================================

import { useState, useContext } from 'react'
import { Eye, EyeOff }          from 'lucide-react'
import { AuthContext }           from '../../../context/AuthContext'
import axiosClient               from '../../../api/axiosClient'

// ─── Mapa sexo label → valor enum de BD ──────────────────────────────────────
const SEXO_MAP: Record<string, string> = {
  Masculino: 'M',
  Femenino:  'F',
  Otro:      'Otro',
}

// ─── Alerta inline reutilizable ───────────────────────────────────────────────
function Alerta({ tipo, mensaje, onClose }: {
  tipo: 'exito' | 'error'
  mensaje: string
  onClose: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold mb-4
      ${tipo === 'exito'
        ? 'bg-green-50 border-green-400 text-green-800'
        : 'bg-red-50   border-red-400   text-red-800'}`}
    >
      <span>{tipo === 'exito' ? '✅' : '❌'} {mensaje}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100 shrink-0">×</button>
    </div>
  )
}

// ─── Estado inicial del formulario ───────────────────────────────────────────
const FORM_VACIO = {
  nombres:          '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  sexo:             'Masculino',
  telefono:         '',
  direccion:        '',
  codigo_postal:    '',
  correo:           '',
  password:         '',
}

export default function TabsRegistrarNuevo() {
  const { user }                        = useContext(AuthContext)
  const [form, setForm]                 = useState(FORM_VACIO)
  const [showPass, setShowPass]         = useState(false)
  const [enviando, setEnviando]         = useState(false)
  const [alerta, setAlerta]             = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
  // terminos: en producción sería un checkbox, aquí se acepta automáticamente
  // al pulsar el botón (el personal valida físicamente en recepción)
  const terminos_aceptados = true

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const limpiarFormulario = () => {
    setForm(FORM_VACIO)
    setShowPass(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlerta(null)

    // Validación mínima en frontend
    if (!form.nombres.trim() || !form.apellido_paterno.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'Nombres y Apellido Paterno son obligatorios.' })
      return
    }
    if (!form.correo.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El correo electrónico es obligatorio.' })
      return
    }
    if (form.password.length < 6) {
      setAlerta({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (!form.fecha_nacimiento) {
      setAlerta({ tipo: 'error', mensaje: 'La fecha de nacimiento es obligatoria.' })
      return
    }

    setEnviando(true)
    try {
      const { data } = await axiosClient.post('/suscriptores', {
        nombres:          form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento,      // YYYY-MM-DD del input[type=date]
        sexo:             SEXO_MAP[form.sexo] ?? 'M',
        telefono:         form.telefono.trim()   || null,
        direccion:        form.direccion.trim()  || null,
        codigo_postal:    form.codigo_postal.trim() || null,
        correo:           form.correo.trim(),
        password:         form.password,
        terminos_aceptados,
      })

      setAlerta({ tipo: 'exito', mensaje: data.message ?? 'Suscriptor registrado correctamente.' })
      limpiarFormulario()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al registrar el suscriptor. Intenta de nuevo.'
      setAlerta({ tipo: 'error', mensaje: msg })
    } finally {
      setEnviando(false)
    }
  }

  const inputCls = 'w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm focus:outline-none focus:border-[#ea580c] disabled:opacity-60'

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-5">Registrar Nuevo Suscriptor</h2>

      {alerta && (
        <Alerta tipo={alerta.tipo} mensaje={alerta.mensaje} onClose={() => setAlerta(null)} />
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>

        {/* Fila 1: Nombres */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Nombres <span className="text-red-500">*</span></label>
            <input name="nombres" value={form.nombres} onChange={handleChange}
              disabled={enviando} placeholder="Ej. Juan Alberto" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Paterno <span className="text-red-500">*</span></label>
            <input name="apellido_paterno" value={form.apellido_paterno} onChange={handleChange}
              disabled={enviando} placeholder="Ej. Pérez" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Materno</label>
            <input name="apellido_materno" value={form.apellido_materno} onChange={handleChange}
              disabled={enviando} placeholder="Ej. López" className={inputCls} />
          </div>
        </div>

        {/* Fila 2: Nacimiento, Sexo, Teléfono */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
            <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange}
              disabled={enviando} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sexo</label>
            <select name="sexo" value={form.sexo} onChange={handleChange}
              disabled={enviando} className={inputCls}>
              <option>Masculino</option>
              <option>Femenino</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange}
              disabled={enviando} placeholder="10 dígitos" maxLength={20} className={inputCls} />
          </div>
        </div>

        {/* Fila 3: Dirección, CP */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-black mb-1">Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange}
              disabled={enviando} placeholder="Calle, Número, Colonia" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Código Postal</label>
            <input name="codigo_postal" value={form.codigo_postal} onChange={handleChange}
              disabled={enviando} placeholder="Ej. 44100" maxLength={10} className={inputCls} />
          </div>
        </div>

        {/* Fila 4: Correo, Contraseña, Sucursal */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
            <input type="email" name="correo" value={form.correo} onChange={handleChange}
              disabled={enviando} placeholder="usuario@email.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Contraseña <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password"
                value={form.password} onChange={handleChange}
                disabled={enviando} placeholder="Mínimo 6 caracteres"
                className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sucursal (Asignada Automáticamente)</label>
            <input readOnly value={user?.nombre_sucursal ?? 'AxF Centro'}
              className="w-full bg-gray-200 border border-gray-300 rounded px-3 py-2 text-black text-sm cursor-not-allowed" />
          </div>
        </div>

        {/* Control de acceso (hardware — pendiente ESP32) */}
        <div className="flex items-center gap-4 pt-2">
          <span className="font-bold text-sm text-black">Control de Acceso:</span>
          <button type="button" disabled
            className="flex items-center gap-2 border-2 border-gray-300 text-gray-400 font-bold text-sm px-4 py-2 rounded cursor-not-allowed"
            title="Pendiente integración ESP32">
            <span>💳</span> Leer Tarjeta NFC
          </button>
          <button type="button" disabled
            className="flex items-center gap-2 border-2 border-gray-300 text-gray-400 font-bold text-sm px-4 py-2 rounded cursor-not-allowed"
            title="Pendiente integración sensor R307">
            <span>👆</span> Escanear Huella
          </button>
        </div>

        {/* Botón submit */}
        <div className="pt-2">
          <button type="submit" disabled={enviando}
            className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
            {enviando && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {enviando ? 'Registrando...' : 'Registrar Suscriptor'}
          </button>
        </div>

      </form>
    </div>
  )
}