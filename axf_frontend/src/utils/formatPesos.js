/**
 * 1500 → '$1,500.00'
 */
export function formatPesos(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/**
 * Formatea número como decimal con 2 posiciones.
 * 73.5 → '73.50'
 */
export function formatDecimal(num) {
  if (num === null || num === undefined) return '—';
  return Number(num).toFixed(2);
}
