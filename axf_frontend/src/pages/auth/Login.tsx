import { useState, useContext } from 'react';
import { loginSucursal } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Extraemos la función login del contexto global
  const { login } = useContext(AuthContext);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await loginSucursal(usuario, password);
      // Usamos la función del contexto en lugar de localStorage manualmente
      login(data.usuario, data.token);
      console.log('[AUTH] Login exitoso:', data.usuario);
      alert(`Bienvenido, ${data.usuario.nombre}`);
    } catch (err: any) {
      console.error('[AUTH] Error:', err);
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
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