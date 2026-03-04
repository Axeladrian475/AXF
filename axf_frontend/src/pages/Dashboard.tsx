import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const isMaestro = user?.rol === 'maestro';

  return (
    <div className="space-y-6">
      {/* Saludo dinámico */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#071B2F] tracking-tight">
            Bienvenido, <span className="text-[#F26A21]">{user?.nombre}</span>
          </h1>
          <p className="text-gray-500 mt-1">
            {isMaestro 
              ? 'Panel de Administración Global de la Franquicia' 
              : 'Panel de Control Local de la Sucursal'}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nivel de Acceso</p>
          <p className="text-lg font-black text-[#071B2F]">{user?.rol.toUpperCase()}</p>
        </div>
      </div>

      {/* Tarjetas de Métricas (Cambian según el rol) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* VISTA MAESTRO */}
        {isMaestro ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Sucursales Activas</span>
              <span className="text-4xl font-black text-[#071B2F]">12</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Usuarios Globales</span>
              <span className="text-4xl font-black text-[#071B2F]">1,248</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Alertas Escaladas (Nivel 3)</span>
              <span className="text-4xl font-black text-red-500">2</span>
            </div>
            <div className="bg-[#071B2F] p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center text-white">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Ingresos Globales</span>
              <span className="text-3xl font-black text-[#F26A21]">$145,000</span>
            </div>
          </>
        ) : (
          /* VISTA SUCURSAL */
          <>
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
          </>
        )}
      </div>

      {/* Accesos Rápidos */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-[#071B2F] mb-4">Accesos Rápidos</h2>
        <div className="flex gap-4">
          {isMaestro && (
            <Link to="/sucursales" className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#071B2F] font-bold py-3 px-6 rounded-xl transition-colors">
              + Nueva Sucursal
            </Link>
          )}
          <Link to="/usuarios" className="bg-[#F26A21] hover:bg-[#d95b1a] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md shadow-[#F26A21]/20">
            {isMaestro ? 'Ver Todos los Usuarios' : 'Inscribir Usuario'}
          </Link>
          <Link to="/alertas" className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#071B2F] font-bold py-3 px-6 rounded-xl transition-colors">
            Revisar Alertas
          </Link>
        </div>
      </div>
    </div>
  );
}