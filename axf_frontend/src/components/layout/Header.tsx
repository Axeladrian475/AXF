import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="h-[60px] bg-[#071B2F] flex items-center justify-between px-6 shadow-md z-10 w-full shrink-0">
      <div className="flex items-center">
        <img src="/axfLogo.png" alt="AxF Logo" className="h-17 object-contain" />
      </div>
      <div className="flex items-center gap-6">
            
        <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors ml-2" title="Cerrar Sesión">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>

      </div>
    </header>
  );
}