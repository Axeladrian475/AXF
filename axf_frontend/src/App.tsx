import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useContext, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import { useFCMNotifications } from './hooks/useFCMNotifications';
import NotificacionToast       from './components/ui/NotificacionToast';
import Login         from './pages/auth/Login';
import ProtectedRoute from './router/ProtectedRoute';
import Dashboard     from './pages/Dashboard';
import Sucursales    from './pages/sucursales/Sucursales';
import Sucursal      from './pages/sucursal/Sucursal';
import Usuarios      from './pages/usuarios/Usuarios';
import Suscripciones from './pages/suscripciones/Suscripciones';
import Reportes      from './pages/reportes/Reportes';
import Recompensas   from './pages/recompensas/Recompensas';
import Chat          from './pages/chat/Chat';
import Entrenamiento from './pages/entrenamiento/Entrenamiento';
import Nutricion          from './pages/nutricion/Nutricion';
import SuscriptoresLista  from './pages/suscriptores/SuscriptoresLista';

// ─── Contador global de IDs para los toasts ──────────────────────────────────
let _notifId = 0

interface NotifPayload {
  id:     number
  titulo: string
  cuerpo: string
  data:   Record<string, string>
}

function RootRedirect() {
  const { isAuthenticated, user } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const rol    = user?.rol    ?? '';
  if (rol === 'maestro')  return <Navigate to="/sucursales" replace />;
  if (rol === 'sucursal') return <Navigate to="/sucursal"   replace />;
  return <Navigate to="/dashboard" replace />;
}

// ─── Componente raíz con notificaciones ──────────────────────────────────────
function AppConNotificaciones() {
  const { token, user }               = useContext(AuthContext)
  const [notifs, setNotifs]           = useState<NotifPayload[]>([])

  // Callback para cuando llega un mensaje en foreground
  const onMensajeEntrante = useCallback(
    (titulo: string, cuerpo: string, data: Record<string, string>) => {
      // Reproducir sonido de notificación
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } catch { /* AudioContext no disponible */ }

      setNotifs(prev => [...prev, { id: ++_notifId, titulo, cuerpo, data }])
    },
    []
  )

  // Registrar FCM token del navegador en el backend
  useFCMNotifications({ token, rol: user?.rol, onMensajeEntrante })

  const cerrarNotif = useCallback((id: number) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }, [])

  const { isAuthenticated } = useContext(AuthContext);

  return (
    <>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <RootRedirect /> : <Login />} />

        <Route element={<ProtectedRoute />}>
          {/* Maestro */}
          <Route path="/sucursales"    element={<Sucursales />} />

          {/* Sucursal admin */}
          <Route path="/sucursal"      element={<Sucursal />} />

          {/* Personal — dashboard como hub */}
          <Route path="/dashboard"     element={<Dashboard />} />

          {/* Módulos accesibles desde el dashboard */}
          <Route path="/usuarios"      element={<Usuarios />} />
          <Route path="/suscripciones" element={<Suscripciones />} />
          <Route path="/reportes"      element={<Reportes />} />
          <Route path="/recompensas"   element={<Recompensas />} />
          <Route path="/chat"          element={<Chat />} />

          {/* Pendientes */}
          <Route path="/entrenamiento"  element={<Entrenamiento />} />
          <Route path="/nutricion"      element={<Nutricion />} />
          <Route path="/suscriptores"   element={<SuscriptoresLista />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>

      {/* Toasts de notificación — visibles en toda la app */}
      <NotificacionToast notificaciones={notifs} onClose={cerrarNotif} />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppConNotificaciones />
    </BrowserRouter>
  );
}

export default App;