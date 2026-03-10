import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/auth/Login';
import ProtectedRoute from './router/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Sucursales from './pages/sucursales/Sucursales';
import Sucursal from './pages/sucursal/Sucursal';

// Redirige al módulo raíz según el rol del usuario
function RootRedirect() {
  const { isAuthenticated, user } = useContext(AuthContext);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const rol = user?.rol ?? '';
  if (rol === 'maestro')   return <Navigate to="/sucursales" replace />;
  if (rol === 'sucursal')  return <Navigate to="/sucursal"   replace />;
  if (rol === 'entrenador' || rol === 'entrenador_nutriologo') return <Navigate to="/entrenamiento" replace />;
  if (rol === 'nutriologo') return <Navigate to="/nutricion" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <RootRedirect /> : <Login />}
        />

        <Route element={<ProtectedRoute />}>
          {/* Maestro */}
          <Route path="/sucursales"    element={<Sucursales />} />

          {/* Sucursal (admin de gym) */}
          <Route path="/sucursal"      element={<Sucursal />} />

          {/* Personal y otros */}
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/entrenamiento" element={<div className="p-4 text-2xl font-bold">Módulo de Entrenamiento (En construcción)</div>} />
          <Route path="/nutricion"     element={<div className="p-4 text-2xl font-bold">Módulo de Nutrición (En construcción)</div>} />
          <Route path="/chat"          element={<div className="p-4 text-2xl font-bold">Módulo de Chat (En construcción)</div>} />
          <Route path="/alertas"       element={<div className="p-4 text-2xl font-bold">Módulo de Alertas (En construcción)</div>} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;