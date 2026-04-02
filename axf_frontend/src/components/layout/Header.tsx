import { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

// URL base del backend para servir imágenes estáticas
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const [imgError, setImgError] = useState(false);

  // Construir URL completa de la foto si existe
  const fotoSrc = user?.foto_url && !imgError
    ? `${BACKEND_URL}${user.foto_url}`
    : null;

  return (
    <header className="h-[60px] bg-[#071B2F] flex items-center justify-between px-6 shadow-md z-10 w-full shrink-0">
      <div className="flex items-center">
        <img src="/axfLogo.png" alt="AxF Logo" className="h-17 object-contain" />
      </div>

      <div className="flex items-center gap-4">
        {/* Info del usuario */}
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-bold leading-tight">{user.nombre}</p>
            <p className="text-[#F26A21] text-xs uppercase tracking-widest font-bold">{user.rol}</p>
          </div>
        )}

        {/* Avatar: foto real o inicial como fallback */}
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#F26A21] flex items-center justify-center flex-shrink-0">
          {fotoSrc ? (
            <img
              src={fotoSrc}
              alt={user?.nombre ?? 'Avatar'}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-white font-black text-sm select-none">
              {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </span>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="text-gray-400 hover:text-red-500 transition-colors ml-1"
          title="Cerrar Sesión"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}