import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const icons = {
  sucursales: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  dashboard: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  personal: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  entrenamiento: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  nutricion: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  usuarios: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  alertas: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  chat: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

type IconKey = keyof typeof icons;

const navByRole: Record<string, { to: string; label: string; icon: IconKey }[]> = {
  maestro: [
    { to: '/sucursales', label: 'Sucursales', icon: 'sucursales' },
  ],
  sucursal: [
    { to: '/sucursal', label: 'Panel', icon: 'dashboard' },
  ],
  staff: [
    { to: '/dashboard',  label: 'Panel',        icon: 'dashboard' },
    { to: '/usuarios',   label: 'Suscriptores', icon: 'usuarios' },
    { to: '/alertas',    label: 'Reportes',     icon: 'alertas' },
  ],
  entrenador: [
    { to: '/dashboard',     label: 'Panel',         icon: 'dashboard' },
    { to: '/entrenamiento', label: 'Rutinas',        icon: 'entrenamiento' },
    { to: '/chat',          label: 'Chat',           icon: 'chat' },
  ],
  nutriologo: [
    { to: '/dashboard', label: 'Panel',     icon: 'dashboard' },
    { to: '/nutricion', label: 'Nutrición', icon: 'nutricion' },
    { to: '/chat',      label: 'Chat',      icon: 'chat' },
  ],
  entrenador_nutriologo: [
    { to: '/dashboard',     label: 'Panel',         icon: 'dashboard' },
    { to: '/entrenamiento', label: 'Rutinas',        icon: 'entrenamiento' },
    { to: '/nutricion',     label: 'Nutrición',      icon: 'nutricion' },
    { to: '/chat',          label: 'Chat',           icon: 'chat' },
  ],
};

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const navItems = navByRole[user?.rol ?? ''] ?? [];

  return (
    <aside className="w-[70px] bg-[#071B2F] h-full shrink-0 hidden md:flex flex-col items-center pt-3 gap-1 shadow-xl z-20">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          className={({ isActive }) =>
            `w-full flex flex-col items-center justify-center py-3 gap-1 transition-colors
            ${isActive
              ? 'text-[#F26A21] bg-white/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          {icons[item.icon]}
          <span className="text-[9px] font-bold uppercase tracking-wide leading-tight text-center px-1">
            {item.label}
          </span>
        </NavLink>
      ))}
    </aside>
  );
}