/**
 * Convierte '2025-06-15' a '15 de junio de 2025'
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString + 'T00:00:00'); // Evita desfase de zona horaria
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Convierte '2025-06-15T14:30:00' a '15/06/2025 14:30'
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Devuelve cuántos días faltan para una fecha.
 * Si ya pasó, devuelve número negativo.
 */
export function diasRestantes(isoString) {
  if (!isoString) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoString + 'T00:00:00');
  const diff = fecha - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
