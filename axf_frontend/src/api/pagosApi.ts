import axiosClient from './axiosClient';

export interface OrdenResponse {
  order_id:    string;
  approve_url: string;   // URL de aprobación en PayPal
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

/** Crea una orden de pago en PayPal y devuelve la URL de aprobación */
export const crearOrdenPago = async (data: {
  id_suscriptor: number;
  id_tipo:        number;
}): Promise<OrdenResponse> => {
  const response = await axiosClient.post('/pagos/crear-orden', data);
  return response.data;
};

/** Captura el pago en PayPal y crea la suscripción en BD */
export const confirmarPago = async (
  token: string,
  sus:   string,
  tipo:  string,
): Promise<ConfirmarPagoResponse> => {
  const response = await axiosClient.get(
    `/pagos/confirmar/${encodeURIComponent(token)}?sus=${sus}&tipo=${tipo}`
  );
  return response.data;
};
