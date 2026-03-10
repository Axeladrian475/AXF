import { useState, useContext } from 'react';
import { loginSucursal } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate(); // Agregamos el hook para redireccionar

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await loginSucursal(usuario, password);
      
      // CORRECCIÓN 1: El backend manda "user", no "usuario"
      login(data.user, data.token); 
      
      console.log('[AUTH] Login exitoso:', data.user);
      
      const rol    = data.user.rol;
      const puesto = data.user.puesto ?? '';

      if (rol === 'maestro')  { navigate('/sucursales'); return; }
      if (rol === 'sucursal') { navigate('/sucursal');   return; }

      // Para el personal, el puesto decide a dónde va
      if (rol === 'personal') {
        if (puesto === 'entrenador')             { navigate('/dashboard'); return; }
        if (puesto === 'nutriologo')             { navigate('/dashboard'); return; }
        if (puesto === 'entrenador_nutriologo')  { navigate('/dashboard'); return; }
        navigate('/dashboard'); // staff y cualquier otro
        return;
      }

      navigate('/dashboard');
      
    } catch (err: any) {
      console.error('[AUTH] Error:', err);
      // CORRECCIÓN 2: El backend manda "message", no "error"
      setError(err.response?.data?.message || 'Error al conectar con el servidor');
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#071B2F] flex flex-col items-center justify-center p-4 overflow-hidden" 
      style={{ fontFamily: 'Jockey One, sans-serif' }}
    >
      <div className="w-full flex flex-col items-center">
        
        <div className="mb-6">
          <img src="/axfLogo.png" alt="AxF Logo" className="w-64 object-contain" />
        </div>

        <div className="bg-[#F26A21] w-full max-w-lg rounded-xl p-8 flex flex-col items-center shadow-2xl">
          <h1 className="text-4xl text-black mb-6 tracking-wide">
            INICIAR SESIÓN
          </h1>

          <form className="w-full flex flex-col items-center" onSubmit={handleLogin}>
            
            <div className="w-[80%] mb-4 flex flex-col items-center">
              <label className="text-black text-2xl mb-1 tracking-wider">
                USUARIO
              </label>
              <input
                type="text"
                placeholder="USUARIO"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-[#E5E5E5] text-gray-500 rounded-lg py-2 px-4 focus:outline-none placeholder:text-xl text-center font-bold"
              />
            </div>

            <div className="w-[80%] mb-8 flex flex-col items-center relative">
              <label className="text-black text-2xl mb-1 tracking-wider">
                CONTRASEÑA
              </label>
              <input
                type="password"
                placeholder="CONTRASEÑA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#E5E5E5] text-gray-500 rounded-lg py-2 px-4 focus:outline-none placeholder:text-xl text-center font-bold"
              />
              
              {error && (
                <p className="absolute -bottom-7 text-white bg-red-600 px-4 py-1 rounded font-sans font-bold w-full text-center text-sm shadow-md">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="bg-[#071B2F] text-white text-2xl py-2 px-10 rounded-2xl hover:bg-slate-800 transition-colors"
            >
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}