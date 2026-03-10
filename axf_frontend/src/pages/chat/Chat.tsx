import { useState } from 'react'

const CONTACTOS = [
  { id: 1, nombre: 'Laura Mendiola', tipo: 'Suscriptora', ultimoMsg: 'Gracias por el consejo!', hora: '10:45 AM', noLeidos: 0, activo: true },
  { id: 2, nombre: 'Juan Pérez',     tipo: 'Suscriptor',  ultimoMsg: '¡Nuevo mensaje!',         hora: 'Ayer',     noLeidos: 2, activo: false },
  { id: 3, nombre: 'Ana García',     tipo: 'Suscriptora', ultimoMsg: 'Ok, lo haré.',            hora: '01/11/25', noLeidos: 0, activo: false },
  { id: 4, nombre: 'Suscriptor Nuevo', tipo: '', ultimoMsg: '', hora: '', noLeidos: 0, activo: false },
]

const MENSAJES_MOCK: Record<number, { id: number; texto: string; hora: string; enviado: boolean; autor?: string }[]> = {
  1: [
    { id: 1, texto: 'Hola! ¿Podría preguntarle algo sobre mi rutina?', hora: '10:40 AM', enviado: false },
    { id: 2, texto: 'Claro que sí, Laura. Dime, ¿en qué te puedo ayudar?', hora: '10:42 AM', enviado: true, autor: 'Entrenador Carlos' },
    { id: 3, texto: '¿Es normal sentir dolor en el hombro al hacer el press militar?', hora: '10:44 AM', enviado: false },
    { id: 4, texto: 'Depende. Baja un poco el peso y revisa tu técnica. Si persiste, usa la máquina en lugar de las mancuernas.', hora: '10:45 AM', enviado: true, autor: 'Entrenador Carlos' },
  ],
}

export default function Chat() {
  const [contactoActivo, setContactoActivo] = useState(CONTACTOS[0])
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')

  const mensajes = MENSAJES_MOCK[contactoActivo.id] ?? []
  const contactosFiltrados = CONTACTOS.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-60px)] bg-white overflow-hidden">
      {/* SIDEBAR CONTACTOS */}
      <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-200">
          <p className="font-bold text-black text-sm mb-2">Contactos / Historial</p>
          <input
            type="text"
            placeholder="Buscar suscriptor o conversación..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white"
          />
          <button className="mt-2 w-full bg-[#1e293b] text-white text-xs font-bold py-2 px-3 rounded flex items-center gap-2 hover:bg-[#0f172a] transition-colors">
            <span>✉</span> Iniciar Nueva Conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contactosFiltrados.map(c => (
            <div key={c.id} onClick={() => setContactoActivo(c)}
              className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors
                ${contactoActivo.id === c.id ? 'bg-blue-500 hover:bg-blue-500' : ''}`}>
              <div className="flex justify-between items-start">
                <span className={`font-bold text-sm ${contactoActivo.id === c.id ? 'text-white' : 'text-black'}`}>
                  {c.nombre}
                  {c.noLeidos > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{c.noLeidos}</span>
                  )}
                </span>
                <span className={`text-xs ${contactoActivo.id === c.id ? 'text-blue-100' : 'text-gray-400'}`}>{c.hora}</span>
              </div>
              {c.ultimoMsg && (
                <p className={`text-xs mt-0.5 truncate ${c.noLeidos > 0 ? 'text-red-500 font-bold' : contactoActivo.id === c.id ? 'text-blue-100' : 'text-gray-500'}`}>
                  {c.noLeidos > 0 ? `¡Nuevo mensaje!` : `Últ. mensaje: "${c.ultimoMsg}"`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA CHAT */}
      <div className="flex-1 flex flex-col">
        {/* Header chat */}
        <div className="px-5 py-3 border-b border-gray-200">
          <p className="font-bold text-[#ea580c] text-base">
            Chat con {contactoActivo.nombre} {contactoActivo.tipo ? `(${contactoActivo.tipo})` : ''}
          </p>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
          {mensajes.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-8">No hay mensajes aún</div>
          ) : (
            <>
              <div className="text-center text-gray-400 text-xs mb-4">Historial cargado</div>
              {mensajes.map(msg => (
                <div key={msg.id} className={`flex ${msg.enviado ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-3 rounded-xl text-sm ${msg.enviado ? 'bg-green-100 text-black' : 'bg-white border border-gray-200 text-black'}`}>
                    <p>{msg.texto}</p>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {msg.hora}{msg.autor ? ` - ${msg.autor}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Input mensaje */}
        <div className="px-5 py-3 border-t border-gray-200 flex gap-3 bg-white">
          <input
            type="text"
            placeholder="Escribe tu mensaje aqui..."
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setMensaje('')}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm text-black bg-gray-50 focus:outline-none focus:border-gray-400"
          />
          <button onClick={() => setMensaje('')}
            className="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
