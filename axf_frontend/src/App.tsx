import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
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
import Nutricion     from './pages/nutricion/Nutricion';

function RootRedirect() {
  const { isAuthenticated, user } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const rol    = user?.rol    ?? '';
  const puesto = user?.puesto ?? '';
  if (rol === 'maestro')  return <Navigate to="/sucursales" replace />;
  if (rol === 'sucursal') return <Navigate to="/sucursal"   replace />;
  // personal siempre al dashboard (el dashboard filtra por puesto)
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const { isAuthenticated } = useContext(AuthContext);
  return (
    <BrowserRouter>
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
          <Route path="/entrenamiento" element={<Entrenamiento />} />
          <Route path="/nutricion"     element={<Nutricion />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
