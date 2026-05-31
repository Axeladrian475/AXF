import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
const WS_URL      = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface Aviso {
  id_aviso:  number;
  mensaje:   string;
  creado_en: string;
  leido:     number;
}

interface NotificacionSucursal {
  id_notificacion: number;
  tipo:            'reporte_personal' | 'strike_3';
  id_reporte:      number;
  mensaje:         string;
  creado_en:       string;
  leida:           number;
}

// ─── Formateador corregido ────────────────────────────────────────────────────
function fmtFecha(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-MX', {
      timeZone:  'America/Mexico_City',
      day:       '2-digit',
      month:     'short',
      hour:      '2-digit',
      minute:    '2-digit',
      hour12:    true,
    });
  } catch {
    return iso;
  }
}

export default function Header() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  // ── Avisos (solo para personal) ──────────────────────────────────────────
  const [avisos,   setAvisos]   = useState<Aviso[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [abierto,  setAbierto]  = useState(false);
  const [marcando, setMarcando] = useState(false);
  const panelRef                = useRef<HTMLDivElement>(null);
  const socketRef               = useRef<Socket | null>(null);

  const esPersonal  = user?.rol === 'personal';
  const esSucursal  = user?.rol === 'sucursal';

  // ── Notificaciones Persistentes (solo sucursal) ────────────────────────
  const [notifSucursal, setNotifSucursal] = useState<NotificacionSucursal[]>([]);
  const [noLeidasSuc,   setNoLeidasSuc]   = useState(0);
  const [abiertoNotif,  setAbiertoNotif]  = useState(false);
  const panelNotifRef                     = useRef<HTMLDivElement>(null);
  const socketSucursalRef                 = useRef<Socket | null>(null);

  const cargarAvisos = useCallback(async () => {
    if (!esPersonal) return;
    try {
      const { data } = await axiosClient.get<{ avisos: Aviso[]; no_leidos: number }>('/avisos/mis-avisos');
      setAvisos(data.avisos);
      setNoLeidos(data.no_leidos);
    } catch { /* silencioso */ }
  }, [esPersonal]);

  const cargarNotificacionesSucursal = useCallback(async () => {
    if (!esSucursal) return;
    try {
      const { data } = await axiosClient.get<{ notificaciones: NotificacionSucursal[]; no_leidas: number }>('/notificaciones-sucursal');
      setNotifSucursal(data.notificaciones);
      setNoLeidasSuc(data.no_leidas);
    } catch { /* silencioso */ }
  }, [esSucursal]);

  // Cargar al montar y periódicamente
  useEffect(() => {
    cargarAvisos();
    cargarNotificacionesSucursal();

    const interval = setInterval(() => {
      cargarAvisos();
      cargarNotificacionesSucursal();
    }, 60_000);
    return () => clearInterval(interval);
  }, [cargarAvisos, cargarNotificacionesSucursal]);

  // ── Socket para avisos en tiempo real ────────────────────────────────────
  useEffect(() => {
    if (!esPersonal || !token) return;

    const socket = io(WS_URL, {
      auth:       { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('aviso:nuevo', (aviso: Aviso) => {
      // Añadir al inicio de la lista y sumar al badge
      setAvisos(prev => [aviso, ...prev]);
      setNoLeidos(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [esPersonal, token]);

  // ── Socket para notificaciones persistentes (solo sucursal) ──────────
  useEffect(() => {
    if (!esSucursal || !token) return;

    const socket = io(WS_URL, {
      auth:       { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
    });
    socketSucursalRef.current = socket;

    // Cuando llega un evento, recargamos la lista desde BD para tener los IDs reales
    socket.on('reporte:personal_nuevo', () => {
      cargarNotificacionesSucursal();
    });

    socket.on('alerta:strike', (data: { nivel: number }) => {
      if (data.nivel === 3) {
        cargarNotificacionesSucursal();
      }
    });

    return () => {
      socket.disconnect();
      socketSucursalRef.current = null;
    };
  }, [esSucursal, token, cargarNotificacionesSucursal]);

  // Cerrar panel alertas al clic fuera
  useEffect(() => {
    if (!abiertoNotif) return;
    const handler = (e: MouseEvent) => {
      if (panelNotifRef.current && !panelNotifRef.current.contains(e.target as Node)) {
        setAbiertoNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abiertoNotif]);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abierto]);

  const marcarTodosLeidos = async () => {
    setMarcando(true);
    try {
      await axiosClient.put('/avisos/leer-todos');
      setAvisos(prev => prev.map(a => ({ ...a, leido: 1 })));
      setNoLeidos(0);
    } catch {
      // silencioso
    } finally {
      setMarcando(false);
    }
  };

  const marcarUnoLeido = async (id: number) => {
    try {
      await axiosClient.put(`/avisos/${id}/leer`);
      setAvisos(prev => prev.map(a => a.id_aviso === id ? { ...a, leido: 1 } : a));
      setNoLeidos(prev => Math.max(0, prev - 1));
    } catch {
      // silencioso
    }
  };

  const marcarTodasNotifSucursalLeidas = async () => {
    setMarcando(true);
    try {
      await axiosClient.put('/notificaciones-sucursal/leer-todas');
      setNotifSucursal(prev => prev.map(n => ({ ...n, leida: 1 })));
      setNoLeidasSuc(0);
    } catch { /* silencioso */ }
    finally { setMarcando(false); }
  };

  const marcarNotifSucursalLeida = async (id: number) => {
    try {
      await axiosClient.put(`/notificaciones-sucursal/${id}/leer`);
      setNotifSucursal(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: 1 } : n));
      setNoLeidasSuc(prev => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  };

  const fotoSrc = user?.foto_url && !imgError
    ? `${BACKEND_URL}${user.foto_url}`
    : null;

  return (
    <header className="h-[60px] bg-[#071B2F] flex items-center justify-between px-6 shadow-md z-10 w-full shrink-0">
      <div className="flex items-center">
        <img src="/axfLogo.png" alt="AxF Logo" className="h-17 object-contain" />
      </div>

      <div className="flex items-center gap-4">

        {/* ── Campanita urgente (solo sucursal) ────────────────────────── */}
        {esSucursal && (
          <div className="relative" ref={panelNotifRef}>
            <button
              onClick={() => setAbiertoNotif(prev => !prev)}
              className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="Notificaciones de Sucursal"
            >
              <svg
                className={`w-6 h-6 transition-colors ${
                  noLeidasSuc > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'
                }`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {noLeidasSuc > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {noLeidasSuc > 9 ? '9+' : noLeidasSuc}
                </span>
              )}
            </button>

            {abiertoNotif && (
              <div className="absolute right-0 top-11 w-96 bg-[#0f172a] border border-red-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-red-900 bg-red-950/50">
                  <span className="text-red-400 font-bold text-sm flex items-center gap-1.5">
                    🚨 Notificaciones
                  </span>
                  {noLeidasSuc > 0 && (
                    <button
                      onClick={marcarTodasNotifSucursalLeidas}
                      disabled={marcando}
                      className="text-xs text-red-400 hover:text-red-200 font-bold transition-colors disabled:opacity-50"
                    >
                      Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifSucursal.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Sin notificaciones</p>
                  ) : (
                    notifSucursal.map((n) => (
                      <div
                        key={n.id_notificacion}
                        onClick={() => {
                          if (!n.leida) marcarNotifSucursalLeida(n.id_notificacion);
                          setAbiertoNotif(false);
                          navigate('/reportes'); // La página principal de reportes (tienen tabs)
                        }}
                        className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors ${
                          n.leida ? 'opacity-60 hover:bg-white/5' : 'bg-red-950/30 hover:bg-red-950/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.leida && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                          )}
                          <div className={!n.leida ? '' : 'ml-4'}>
                            <p className="text-white text-xs leading-snug font-semibold">{n.mensaje}</p>
                            <p className="text-[#F26A21] text-[10px] mt-0.5 font-semibold">Ver reporte →</p>
                            <p className="text-gray-500 text-[10px] mt-1">{fmtFecha(n.creado_en)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Campanita de avisos (solo personal) ────────────────────────── */}
        {esPersonal && (
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setAbierto(prev => !prev)}
              className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="Mis avisos"
            >
              {/* Icono campana */}
              <svg
                className={`w-6 h-6 transition-colors ${noLeidos > 0 ? 'text-[#F26A21]' : 'text-gray-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>

              {/* Badge número no leídos */}
              {noLeidos > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {noLeidos > 9 ? '9+' : noLeidos}
                </span>
              )}
            </button>

            {/* Panel de avisos */}
            {abierto && (
              <div className="absolute right-0 top-11 w-80 bg-[#0f172a] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {/* Header panel */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                  <span className="text-white font-bold text-sm">Mis Avisos</span>
                  {noLeidos > 0 && (
                    <button
                      onClick={marcarTodosLeidos}
                      disabled={marcando}
                      className="text-xs text-[#F26A21] hover:text-orange-300 font-bold transition-colors disabled:opacity-50"
                    >
                      Marcar todos como leídos
                    </button>
                  )}
                </div>

                {/* Lista */}
                <div className="max-h-80 overflow-y-auto">
                  {avisos.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Sin avisos</p>
                  ) : (
                    avisos.map(a => {
                      const esMensajeChat = a.mensaje.startsWith('💬');
                      return (
                        <div
                          key={a.id_aviso}
                          onClick={() => {
                            if (!a.leido) marcarUnoLeido(a.id_aviso);
                            if (esMensajeChat) {
                              setAbierto(false);
                              navigate('/chat');
                            }
                          }}
                          className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors
                            ${a.leido ? 'opacity-60 hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                          <div className="flex items-start gap-2">
                            {/* Punto naranja = no leído */}
                            {!a.leido && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-[#F26A21] shrink-0" />
                            )}
                            <div className={!a.leido ? '' : 'ml-4'}>
                              <p className="text-white text-xs leading-snug">{a.mensaje}</p>
                              {esMensajeChat && (
                                <p className="text-[#F26A21] text-[10px] mt-0.5 font-semibold">Ir al chat →</p>
                              )}
                              <p className="text-gray-500 text-[10px] mt-1">{fmtFecha(a.creado_en)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info del usuario */}
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-bold leading-tight">{user.nombre}</p>
            <p className="text-[#F26A21] text-xs uppercase tracking-widest font-bold">{user.rol}</p>
          </div>
        )}

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#F26A21] flex items-center justify-center flex-shrink-0">
          {fotoSrc ? (
            <img src={fotoSrc} alt={user?.nombre ?? 'Avatar'}
              className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <span className="text-white font-black text-sm select-none">
              {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </span>
          )}
        </div>

        {/* Logout */}
        <button onClick={logout}
          className="text-gray-400 hover:text-red-500 transition-colors ml-1" title="Cerrar Sesión">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}