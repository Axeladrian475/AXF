import axiosClient from './axiosClient';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Recompensa {
  id_recompensa: number;
  nombre: string;
  costo_puntos: number;
  activa: number;
}

export interface SuscriptorIdentificado {
  id_suscriptor: number;
  nombre: string;
  puntos: number;
  activo: number;
}

export interface ResultadoCanje {
  message: string;
  id_canje: number;
  puntos_gastados: number;
  puntos_restantes: number;
}

export interface HardwareToken {
  token: string;
  tipo: string;
  expira_en: string;
}

export interface HardwarePoll {
  estado: 'pending' | 'reading' | 'done' | 'error';
  tipo?: string;
  valor?: string;
  paso?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

/** Lista todas las recompensas activas de la sucursal del usuario logueado */
export async function getRecompensas(): Promise<Recompensa[]> {
  const { data } = await axiosClient.get<Recompensa[]>('/recompensas');
  return data;
}

/**
 * Registra un canje y descuenta puntos al suscriptor.
 * El id_personal se toma del JWT (usuario logueado).
 */
export async function canjearRecompensa(
  id_recompensa: number,
  id_suscriptor: number
): Promise<ResultadoCanje> {
  const { data } = await axiosClient.post<ResultadoCanje>('/recompensas/canjear', {
    id_recompensa,
    id_suscriptor,
  });
  return data;
}

/**
 * Dado un tipo (nfc | huella) y el valor raw leído por el ESP32,
 * devuelve la información del suscriptor al que pertenece.
 */
export async function identificarSuscriptor(
  tipo: 'nfc' | 'huella',
  valor: string
): Promise<SuscriptorIdentificado> {
  const { data } = await axiosClient.post<SuscriptorIdentificado>(
    '/suscriptores/identificar',
    { tipo, valor }
  );
  return data;
}

/**
 * Solicita al backend un token de sesión para el ESP32.
 * El ESP32 hace polling de este token para saber qué debe leer.
 */
export async function iniciarSesionHardware(
  tipo: 'nfc' | 'huella' | 'huella_enroll' | 'huella_leer'
): Promise<HardwareToken> {
  const { data } = await axiosClient.post<HardwareToken>('/hardware/token', { tipo });
  return data;
}

/**
 * Escucha actualizaciones de hardware vía Server-Sent Events (SSE).
 * Latencia ~0ms: el evento llega en cuanto el ESP32 reporta.
 *
 * Devuelve una función cleanup para cerrar la conexión.
 *
 * @param token    Token de sesión de hardware
 * @param onUpdate Callback con el estado actualizado
 * @returns        Función para cerrar el EventSource
 */
export function escucharHardwareSSE(
  token: string,
  onUpdate: (poll: HardwarePoll) => void
): () => void {
  const baseURL = (axiosClient.defaults.baseURL ?? '').replace(/\/$/, '');
  const jwtToken = localStorage.getItem('token') ?? '';
  const url = `${baseURL}/hardware/sse/${token}?jwt=${jwtToken}`;

  const es = new EventSource(url);
  let cerrado = false;

  // Timeout de seguridad: si en 90s no hay respuesta, cierra y reporta error
  const timeoutId = setTimeout(() => {
    if (!cerrado) {
      cerrado = true;
      es.close();
      onUpdate({ estado: 'error', paso: 'timeout_general' });
    }
  }, 90000);

  es.onmessage = (event) => {
    if (cerrado) return;
    try {
      const data: HardwarePoll = JSON.parse(event.data);
      onUpdate(data);

      // Si el estado es terminal, cerrar la conexión
      if (data.estado === 'done' || data.estado === 'error') {
        cerrado = true;
        clearTimeout(timeoutId);
        es.close();
      }
    } catch (_) {
      // ignorar frames de keep-alive malformados
    }
  };

  es.onerror = () => {
    if (cerrado) return;
    cerrado = true;
    clearTimeout(timeoutId);
    es.close();
    onUpdate({ estado: 'error', paso: 'conexion_perdida' });
  };

  return () => {
    if (!cerrado) {
      cerrado = true;
      clearTimeout(timeoutId);
      es.close();
    }
  };
}

/**
 * Consulta el estado actual de la sesión de hardware (fallback polling).
 * Preferir escucharHardwareSSE() para latencia mínima.
 */
export async function pollHardware(token: string): Promise<HardwarePoll> {
  const { data } = await axiosClient.get<HardwarePoll>(`/hardware/poll/${token}`);
  return data;
}