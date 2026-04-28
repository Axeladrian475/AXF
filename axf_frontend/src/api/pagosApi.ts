import axiosClient from './axiosClient';

export interface OrdenResponse {
  order_id:    string;
  approve_url: string;
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

/** Crea una orden en PayPal (usada por el flujo redirect Y por Card Fields) */
export const crearOrdenPago = async (data: {
  id_suscriptor: number;
  id_tipo?:      number;
  id_promocion?: number;
}): Promise<OrdenResponse> => {
  const response = await axiosClient.post('/pagos/crear-orden', data);
  return response.data;
};

/** Confirma un pago del flujo redirect (GET, con token en URL) */
export const confirmarPago = async (
  token: string,
  sus:   string,
  tipo?: string,
  promo?: string,
): Promise<ConfirmarPagoResponse> => {
  let url = `/pagos/confirmar/${encodeURIComponent(token)}?sus=${sus}`;
  if (tipo) url += `&tipo=${tipo}`;
  if (promo) url += `&promo=${promo}`;
  const response = await axiosClient.get(url);
  return response.data;
};

/** Captura una orden ya aprobada por Card Fields (POST, inline) */
export const capturarOrden = async (data: {
  order_id:      string;
  id_suscriptor: number;
  id_tipo?:      number;
  id_promocion?: number;
}): Promise<ConfirmarPagoResponse> => {
  const response = await axiosClient.post('/pagos/capturar-orden', data);
  return response.data;
};
