// ============================================================================
//  utils/imageUrl.ts
//
//  Centraliza la construcción de URLs de imágenes para que funcionen
//  tanto en localhost como en producción sin cambiar código.
//
//  Las fotos se guardan en la BD como rutas relativas: /uploads/xxx/yyy.jpg
//  Este utilitario las convierte en URLs absolutas usando VITE_API_URL.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_URL ?? 'https://axfgymnet.com/api')
  .replace('/api', '')
  .replace(/\/$/, ''); // quitar trailing slash si existe

/**
 * Convierte una ruta relativa de imagen guardada en la BD
 * en una URL absoluta apuntando al backend correcto según el entorno.
 *
 * @param path  Valor de foto_url / imagen_url de la BD (ej: "/uploads/personal/sus_123.jpg")
 *              Si ya es una URL completa (http://...) la devuelve sin cambios.
 *              Si es null/undefined devuelve null.
 * @param cacheBust  Número opcional para evitar caché (timestamp)
 */
export function imageUrl(path: string | null | undefined, cacheBust?: number): string | null {
  if (!path) return null;

  // Si ya es una URL completa, devolverla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return cacheBust ? `${path}?t=${cacheBust}` : path;
  }

  const url = `${API_BASE}${path}`;
  return cacheBust ? `${url}?t=${cacheBust}` : url;
}
