import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function TabsRegistrarNuevo() {
  const [showPass, setShowPass] = useState(false)

  return (
    <div>
      <h2 className="text-xl font-bold text-black mb-5">Registrar Nuevo Suscriptor</h2>

      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Nombres</label>
            <input placeholder="Ej. Juan Alberto"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Paterno</label>
            <input placeholder="Ej. Pérez"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Apellido Materno</label>
            <input placeholder="Ej. López"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Fecha de Nacimiento</label>
            <input type="date"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sexo</label>
            <select className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm">
              <option>Masculino</option>
              <option>Femenino</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Teléfono</label>
            <input placeholder="10 digitos"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-black mb-1">Dirección</label>
            <input placeholder="Calle, Número, Colonia"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Código Postal</label>
            <input placeholder="Ej. 44100"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Correo Electrónico</label>
            <input type="email" placeholder="usuario@email.com"
              className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Contraseña</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} placeholder="••••••"
                className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 pr-10 text-black text-sm" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-1">Sucursal (Asignada Automáticamente)</label>
            <input readOnly defaultValue="AxF Centro"
              className="w-full bg-gray-200 border border-gray-300 rounded px-3 py-2 text-black text-sm cursor-not-allowed" />
          </div>
        </div>

        {/* Control de acceso */}
        <div className="flex items-center gap-4 pt-2">
          <span className="font-bold text-sm text-black">Control de Acceso:</span>
          <button type="button"
            className="flex items-center gap-2 border-2 border-gray-400 text-black font-bold text-sm px-4 py-2 rounded hover:bg-gray-100 transition-colors">
            <span>💳</span> Leer Tarjeta NFC
          </button>
          <button type="button"
            className="flex items-center gap-2 border-2 border-gray-400 text-black font-bold text-sm px-4 py-2 rounded hover:bg-gray-100 transition-colors">
            <span>👆</span> Escanear Huella
          </button>
        </div>

        <div className="pt-2">
          <button type="submit"
            className="bg-[#ea580c] text-white font-bold px-8 py-2 rounded hover:bg-[#c94a0a] transition-colors">
            Registrar Suscriptor
          </button>
        </div>
      </form>
    </div>
  )
}
