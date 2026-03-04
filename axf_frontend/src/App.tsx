import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/auth/Login';
import ProtectedRoute from './router/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Sucursales from './pages/sucursales/Sucursales';

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sucursales" element={<Sucursales />} />
          <Route path="/usuarios" element={<div className="p-4 text-2xl font-bold">Módulo de Usuarios (En construcción)</div>} />
          <Route path="/personal" element={<div className="p-4 text-2xl font-bold">Módulo de Personal (En construcción)</div>} />
          <Route path="/entrenamiento" element={<div className="p-4 text-2xl font-bold">Módulo de Entrenamiento (En construcción)</div>} />
          <Route path="/nutricion" element={<div className="p-4 text-2xl font-bold">Módulo de Nutrición (En construcción)</div>} />
          <Route path="/chat" element={<div className="p-4 text-2xl font-bold">Módulo de Chat (En construcción)</div>} />
          <Route path="/alertas" element={<div className="p-4 text-2xl font-bold">Módulo de Alertas (En construcción)</div>} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;