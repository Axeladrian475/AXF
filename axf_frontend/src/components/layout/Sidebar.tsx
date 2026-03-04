import { Link, useLocation } from 'react-router-dom';

const MENU_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/sucursales', label: 'Sucursales' },
  { path: '/usuarios', label: 'Usuarios' },
  { path: '/personal', label: 'Personal' },
  { path: '/entrenamiento', label: 'Entrenamiento' },
  { path: '/nutricion', label: 'Nutrición' },
  { path: '/chat', label: 'Chat' },
  { path: '/alertas', label: 'Alertas' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[250px] bg-[#071B2F] text-white flex flex-col h-full">
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        <span className="text-2xl font-bold text-[#F26A21]" style={{ fontFamily: 'Jockey One, sans-serif' }}>
          AxF GymNet
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`block px-6 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-[#F26A21] text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}