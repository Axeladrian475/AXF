import axiosClient from './axiosClient';

export interface PreferenciaResponse {
  preference_id:      string;
  url_pago:           string;   // sandbox_init_point o init_point según credenciales
  external_reference: string;
}

export interface ConfirmarPagoResponse {
  ok:           boolean;
  status?:      string;
  message?:     string;
  suscripcion?: {
    id_suscripcion: number;
    fecha_inicio:   string;
    fecha_fin:      string;
    estado:         string;
    plan_nombre:    string;
  };
}

/** Crea preferencia de pago en MP y devuelve la URL de pago */
export const crearPreferenciaPago = async (data: {
  id_suscriptor: number;
  id_tipo:        number;
}): Promise<PreferenciaResponse> => {
  const response = await axiosClient.post('/pagos/crear-preferencia', data);
  return response.data;
};

/** Confirma el pago consultando MP y crea la suscripción en BD */
export const confirmarPago = async (ref: string): Promise<ConfirmarPagoResponse> => {
  const response = await axiosClient.get(`/pagos/confirmar/${encodeURIComponent(ref)}`);
  return response.data;
};
