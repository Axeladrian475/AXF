import axiosClient from './axiosClient';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PreferenciaResponse {
  preference_id:       string;
  init_point:          string;          // URL de pago real (producción)
  sandbox_init_point?: string;          // URL de pago de prueba (sandbox MP)
  external_reference:  string;          // "SUS-{id}-TIPO-{id}-{ts}" — fallback de verificación
}

export interface VerificacionPago {
  procesado:   boolean;
  suscripcion?: {
    id_suscripcion: number;
    fecha_inicio:   string;
    fecha_fin:      string;
    estado:         string;
    plan_nombre:    string;
  };
  status?:   string;
  aprobado?: boolean;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * Crea una preferencia de pago en Mercado Pago y devuelve la URL de pago.
 * En modo sandbox (credenciales de prueba) también devuelve sandbox_init_point.
 */
export const crearPreferenciaPago = async (data: {
  id_suscriptor: number;
  id_tipo:        number;
}): Promise<PreferenciaResponse> => {
  const response = await axiosClient.post('/pagos/crear-preferencia', data);
  return response.data;
};

/**
 * Verifica si un pago ya fue procesado y la suscripción fue creada.
 * Acepta como :ref:
 *   - payment_id numérico (que MP añade al redirect URL)
 *   - external_reference  (que pusimos en back_urls como ?extref=)
 */
export const verificarPago = async (ref: string): Promise<VerificacionPago> => {
  const response = await axiosClient.get(`/pagos/verificar/${encodeURIComponent(ref)}`);
  return response.data;
};
