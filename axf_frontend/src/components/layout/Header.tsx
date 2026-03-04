import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="h-16 bg-[#071B2F] border-b border-gray-700 flex items-center justify-between px-6 text-white w-full">
      <div className="flex items-center">
        <span className="text-lg font-medium">Panel de Control</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-right">
          <p className="font-bold text-[#F26A21]">{user?.nombre}</p>
          <p className="text-xs text-gray-400 uppercase">{user?.rol}</p>
        </div>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Salir
        </button>
      </div>
    </header>
  );
}