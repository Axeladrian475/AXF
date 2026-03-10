import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  // Si el usuario es el Maestro, su "Dashboard" es el módulo de Sucursales
  if (user?.rol === 'maestro') {
    return <Navigate to="/sucursales" replace />;
  }

  // --- VISTA PARA SUCURSAL Y PERSONAL (Nivel 2 y 3) ---
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#071B2F] tracking-tight">
            Bienvenido, <span className="text-[#F26A21]">{user?.nombre}</span>
          </h1>
          <p className="text-gray-500 mt-1">Panel de Control Local de la Sucursal</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nivel de Acceso</p>
          <p className="text-lg font-black text-[#071B2F]">{user?.rol?.toUpperCase()}</p>
        </div>
      </div>

      {/* Tarjetas de Métricas de la Sucursal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Aforo Actual</span>
          <span className="text-4xl font-black text-[#071B2F]">45<span className="text-xl text-gray-400">/100</span></span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Suscriptores Activos</span>
          <span className="text-4xl font-black text-[#071B2F]">312</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Reportes Pendientes</span>
          <span className="text-4xl font-black text-yellow-500">3</span>
        </div>
        <div className="bg-[#071B2F] p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center text-white">
          <span className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Vencimientos Hoy</span>
          <span className="text-4xl font-black text-[#F26A21]">8</span>
        </div>
      </div>
    </div>
  );
  
}