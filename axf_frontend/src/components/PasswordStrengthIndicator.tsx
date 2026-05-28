// ============================================================================
//  components/PasswordStrengthIndicator.tsx
//
//  Indicador visual de fortaleza de contraseña (RQNF3).
//  Muestra en tiempo real qué criterios se cumplen y cuáles faltan.
// ============================================================================

import { evaluarFortaleza } from '../utils/passwordValidator'

interface Props {
  password: string
  usuario: string   // nombre de usuario / correo para validar que no coincida
}

interface Regla {
  key: keyof ReturnType<typeof evaluarFortaleza>
  label: string
}

const REGLAS: Regla[] = [
  { key: 'longitud',    label: 'Mínimo 8 caracteres' },
  { key: 'mayuscula',   label: 'Al menos una mayúscula' },
  { key: 'minuscula',   label: 'Al menos una minúscula' },
  { key: 'numero',      label: 'Al menos un número' },
  { key: 'especial',    label: 'Al menos un carácter especial (@, #, !, $...)' },
  { key: 'noEsUsuario', label: 'No coincide con el usuario' },
]

export default function PasswordStrengthIndicator({ password, usuario }: Props) {
  if (!password) return null

  const fortaleza = evaluarFortaleza(password, usuario)
  const cumplidas  = Object.values(fortaleza).filter(Boolean).length
  const total      = REGLAS.length

  // Color de la barra de progreso
  const barColor =
    cumplidas <= 2 ? 'bg-red-500' :
    cumplidas <= 4 ? 'bg-yellow-400' :
    cumplidas === 5 ? 'bg-blue-500' :
    'bg-green-500'

  const etiqueta =
    cumplidas <= 2 ? 'Muy débil' :
    cumplidas <= 4 ? 'Débil' :
    cumplidas === 5 ? 'Aceptable' :
    'Segura'

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de progreso */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${(cumplidas / total) * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold shrink-0 ${
          cumplidas <= 2 ? 'text-red-500' :
          cumplidas <= 4 ? 'text-yellow-600' :
          cumplidas === 5 ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {etiqueta}
        </span>
      </div>

      {/* Lista de criterios */}
      <ul className="space-y-0.5">
        {REGLAS.map(regla => (
          <li key={regla.key} className="flex items-center gap-1.5">
            <span className={`text-xs font-bold leading-none ${
              fortaleza[regla.key] ? 'text-green-500' : 'text-red-400'
            }`}>
              {fortaleza[regla.key] ? '✓' : '✗'}
            </span>
            <span className={`text-[11px] ${
              fortaleza[regla.key] ? 'text-green-700' : 'text-gray-500'
            }`}>
              {regla.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
