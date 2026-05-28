// ============================================================================
//  utils/passwordValidator.ts
//
//  RQNF3: Validación de contraseña según criterios de seguridad:
//    - Al menos 8 caracteres
//    - Al menos una letra mayúscula
//    - Al menos una letra minúscula
//    - Al menos un número
//    - Al menos un carácter especial
//    - No debe coincidir con el nombre de usuario
// ============================================================================

export interface PasswordRuleResult {
  valido: boolean
  mensaje: string
}

export interface PasswordStrength {
  longitud:    boolean
  mayuscula:   boolean
  minuscula:   boolean
  numero:      boolean
  especial:    boolean
  noEsUsuario: boolean
}

/** Verifica cuáles reglas cumple la contraseña (para el indicador visual). */
export function evaluarFortaleza(password: string, usuario: string): PasswordStrength {
  const u = usuario.trim().toLowerCase()
  const p = password
  return {
    longitud:    p.length >= 8,
    mayuscula:   /[A-Z]/.test(p),
    minuscula:   /[a-z]/.test(p),
    numero:      /[0-9]/.test(p),
    especial:    /[^A-Za-z0-9]/.test(p),
    noEsUsuario: u.length === 0 || p.toLowerCase() !== u,
  }
}

/** Valida la contraseña y devuelve el primer error encontrado, o null si es válida. */
export function validarPassword(password: string, usuario: string): string | null {
  if (password.length < 8)
    return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password))
    return 'La contraseña debe incluir al menos una letra mayúscula.'
  if (!/[a-z]/.test(password))
    return 'La contraseña debe incluir al menos una letra minúscula.'
  if (!/[0-9]/.test(password))
    return 'La contraseña debe incluir al menos un número.'
  if (!/[^A-Za-z0-9]/.test(password))
    return 'La contraseña debe incluir al menos un carácter especial (ej. @, #, !, $).'
  if (usuario.trim() && password.toLowerCase() === usuario.trim().toLowerCase())
    return 'La contraseña no puede ser igual al nombre de usuario.'
  return null
}
