// ============================================================================
//  pages/chat/Chat.tsx  — VERSIÓN FUNCIONAL
//  Chat en tiempo real entre personal y suscriptores
//  REST: /api/chat/conversaciones · /api/chat/mensajes/:id · /api/chat/suscriptores-disponibles
//  WS:   socket.io → mismo servidor backend (puerto 3001)
// ============================================================================

import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import axiosClient from '../../api/axiosClient'
import { AuthContext } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Conversacion {
  id_suscriptor:      number
  nombre_suscriptor:  string
  correo:             string
  ultimo_mensaje:     string | null
  ultimo_mensaje_en:  string | null
  ultimo_enviado_por: 'personal' | 'suscriptor' | null
  no_leidos:          number
}

interface Mensaje {
  id_mensaje:  number
  enviado_por: 'personal' | 'suscriptor'
  contenido:   string
  leido:       number
  enviado_en:  string
}

interface SuscriptorDisponible {
  id_suscriptor: number
  nombre:        string
  correo:        string
  tiene_chat:    number
}

// ─── Formatear timestamp ──────────────────────────────────────────────────────
function formatHora(isoString: string | null): string {
  if (!isoString) return ''
  const fecha = new Date(isoString)
  const hoy   = new Date()
  const ayer  = new Date(); ayer.setDate(hoy.getDate() - 1)
  const mismo = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (mismo(fecha, hoy))  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (mismo(fecha, ayer)) return 'Ayer'
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

// =============================================================================
export default function Chat() {
  const { token, user } = useContext(AuthContext)

  const [conversaciones, setConversaciones]     = useState<Conversacion[]>([])
  const [suscActivoId, setSuscActivoId]         = useState<number | null>(null)
  const [mensajes, setMensajes]                 = useState<Mensaje[]>([])
  const [texto, setTexto]                       = useState('')
  const [busqueda, setBusqueda]                 = useState('')
  const [cargandoConvs, setCargandoConvs]       = useState(true)
  const [cargandoMsgs, setCargandoMsgs]         = useState(false)
  const [enviando, setEnviando]                 = useState(false)
  const [escribiendo, setEscribiendo]           = useState(false)
  const [modalNuevo, setModalNuevo]             = useState(false)
  const [suscDisp, setSuscDisp]                 = useState<SuscriptorDisponible[]>([])
  const [buscandoNuevo, setBuscandoNuevo]       = useState('')
  const [cargandoDisp, setCargandoDisp]         = useState(false)
  const [errorConvs, setErrorConvs]             = useState<string | null>(null)
  const [wsConectado, setWsConectado]           = useState(false)

  const socketRef        = useRef<Socket | null>(null)
  const msgEndRef        = useRef<HTMLDivElement>(null)
  const inputRef         = useRef<HTMLInputElement>(null)
  const escribiendoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suscActivoRef    = useRef<number | null>(null)

  // Mantener ref sincronizada para usarla dentro de closures de socket
  useEffect(() => { suscActivoRef.current = suscActivoId }, [suscActivoId])

  const suscActivo = conversaciones.find(c => c.id_suscriptor === suscActivoId) ?? null

  // ── 1. Socket.io ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const socket = io(WS_URL, { auth: { token }, transports: ['websocket'] })

    socket.on('connect',       () => setWsConectado(true))
    socket.on('disconnect',    () => setWsConectado(false))
    socket.on('connect_error', () => setWsConectado(false))

    socket.on('chat:mensaje_nuevo', ({ id_suscriptor, mensaje }: { id_suscriptor: number; mensaje: Mensaje }) => {
      // Agregar mensaje si el chat está abierto
      if (suscActivoRef.current === id_suscriptor) {
        setMensajes(prev => [...prev, mensaje])
        socket.emit('chat:leer', { id_suscriptor })
      }
      // Actualizar lista de conversaciones
      setConversaciones(prev => {
        const existe = prev.find(c => c.id_suscriptor === id_suscriptor)
        const nuevaLista = existe
          ? prev.map(c => c.id_suscriptor === id_suscriptor
              ? {
                  ...c,
                  ultimo_mensaje:     mensaje.contenido,
                  ultimo_mensaje_en:  mensaje.enviado_en,
                  ultimo_enviado_por: mensaje.enviado_por,
                  no_leidos: suscActivoRef.current === id_suscriptor ? 0 : c.no_leidos + 1,
                }
              : c)
          : prev // la recargamos abajo
        return [...nuevaLista].sort((a, b) =>
          new Date(b.ultimo_mensaje_en ?? 0).getTime() - new Date(a.ultimo_mensaje_en ?? 0).getTime()
        )
      })
    })

    socket.on('chat:mensajes_leidos', ({ id_suscriptor }: { id_suscriptor: number }) => {
      setMensajes(prev => prev.map(m =>
        m.enviado_por === 'personal' ? { ...m, leido: 1 } : m
      ))
      setConversaciones(prev => prev.map(c =>
        c.id_suscriptor === id_suscriptor ? { ...c, no_leidos: 0 } : c
      ))
    })

    socket.on('chat:escribiendo',    () => setEscribiendo(true))
    socket.on('chat:parar_escribir', () => setEscribiendo(false))

    socketRef.current = socket
    return () => { socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── 2. Cargar conversaciones ──────────────────────────────────────────────
  const cargarConversaciones = useCallback(async () => {
    setCargandoConvs(true)
    setErrorConvs(null)
    try {
      const { data } = await axiosClient.get('/chat/conversaciones')
      setConversaciones(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrorConvs(msg || 'No se pudieron cargar las conversaciones')
    } finally {
      setCargandoConvs(false)
    }
  }, [])

  useEffect(() => { cargarConversaciones() }, [cargarConversaciones])

  // ── 3. Cargar mensajes al cambiar de suscriptor ───────────────────────────
  useEffect(() => {
    if (suscActivoId === null) { setMensajes([]); return }
    let cancelado = false

    const cargar = async () => {
      setCargandoMsgs(true)
      try {
        const { data } = await axiosClient.get(`/chat/mensajes/${suscActivoId}`)
        if (!cancelado) {
          setMensajes(data.mensajes ?? [])
          socketRef.current?.emit('chat:leer', { id_suscriptor: suscActivoId })
          setConversaciones(prev => prev.map(c =>
            c.id_suscriptor === suscActivoId ? { ...c, no_leidos: 0 } : c
          ))
        }
      } catch {
        if (!cancelado) setMensajes([])
      } finally {
        if (!cancelado) setCargandoMsgs(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [suscActivoId])

  // ── 4. Scroll automático ──────────────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, escribiendo])

  // ── 5. Enviar mensaje ─────────────────────────────────────────────────────
  const enviarMensaje = useCallback(() => {
    const contenido = texto.trim()
    if (!contenido || suscActivoId === null || enviando) return

    if (!wsConectado) {
      // Fallback REST si no hay WebSocket
      setEnviando(true)
      axiosClient.post('/chat/mensajes', { id_suscriptor: suscActivoId, contenido })
        .then(({ data }) => {
          setMensajes(prev => [...prev, data.mensaje])
          setConversaciones(prev => prev.map(c =>
            c.id_suscriptor === suscActivoId
              ? { ...c, ultimo_mensaje: contenido, ultimo_mensaje_en: data.mensaje.enviado_en, ultimo_enviado_por: 'personal' }
              : c
          ))
        })
        .finally(() => setEnviando(false))
      setTexto('')
      return
    }

    setEnviando(true)
    socketRef.current?.emit(
      'chat:enviar',
      { id_suscriptor: suscActivoId, contenido },
      (resp: { ok: boolean; mensaje?: Mensaje }) => {
        setEnviando(false)
        if (resp?.ok && resp.mensaje) {
          setMensajes(prev => [...prev, resp.mensaje!])
          setConversaciones(prev =>
            prev.map(c => c.id_suscriptor === suscActivoId
              ? { ...c, ultimo_mensaje: contenido, ultimo_mensaje_en: resp.mensaje!.enviado_en, ultimo_enviado_por: 'personal' }
              : c
            ).sort((a, b) =>
              new Date(b.ultimo_mensaje_en ?? 0).getTime() - new Date(a.ultimo_mensaje_en ?? 0).getTime()
            )
          )
        }
      }
    )
    setTexto('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [texto, suscActivoId, enviando, wsConectado])

  // ── 6. Indicador escribiendo ──────────────────────────────────────────────
  const onEscribir = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTexto(e.target.value)
    if (suscActivoId === null) return
    socketRef.current?.emit('chat:escribiendo', { id_suscriptor: suscActivoId })
    if (escribiendoTimer.current) clearTimeout(escribiendoTimer.current)
    escribiendoTimer.current = setTimeout(() => {
      socketRef.current?.emit('chat:parar_escribir', { id_suscriptor: suscActivoId })
    }, 2000)
  }

  // ── 7. Modal nueva conversación ───────────────────────────────────────────
  const abrirModal = async () => {
    setModalNuevo(true)
    setBuscandoNuevo('')
    setCargandoDisp(true)
    try {
      const { data } = await axiosClient.get('/chat/suscriptores-disponibles')
      setSuscDisp(data)
    } catch {
      setSuscDisp([])
    } finally {
      setCargandoDisp(false)
    }
  }

  const iniciarConversacion = (s: SuscriptorDisponible) => {
    setModalNuevo(false)
    if (!conversaciones.find(c => c.id_suscriptor === s.id_suscriptor)) {
      setConversaciones(prev => [{
        id_suscriptor: s.id_suscriptor,
        nombre_suscriptor: s.nombre,
        correo: s.correo,
        ultimo_mensaje: null,
        ultimo_mensaje_en: null,
        ultimo_enviado_por: null,
        no_leidos: 0,
      }, ...prev])
    }
    setSuscActivoId(s.id_suscriptor)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  const convsFiltradas = conversaciones.filter(c =>
    c.nombre_suscriptor.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.correo.toLowerCase().includes(busqueda.toLowerCase())
  )
  const suscDispFiltrados = suscDisp.filter(s =>
    s.nombre.toLowerCase().includes(buscandoNuevo.toLowerCase()) ||
    s.correo.toLowerCase().includes(buscandoNuevo.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-60px)] bg-white overflow-hidden rounded-lg shadow-md -m-5">

      {/* ══════════════ SIDEBAR ══════════════ */}
      <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-black text-sm">Contactos / Historial</p>
            {/* Indicador WS */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${wsConectado ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-[9px] text-gray-400">{wsConectado ? 'En línea' : 'Offline'}</span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar suscriptor o conversación..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black bg-white focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={abrirModal}
            className="mt-2 w-full bg-[#1e293b] text-white text-xs font-bold py-2 px-3 rounded flex items-center gap-2 hover:bg-[#0f172a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Iniciar Nueva Conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargandoConvs ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : errorConvs ? (
            <div className="p-4 text-center">
              <p className="text-red-500 text-xs mb-2">{errorConvs}</p>
              <button onClick={cargarConversaciones} className="text-xs text-orange-500 underline">
                Reintentar
              </button>
            </div>
          ) : convsFiltradas.length === 0 ? (
            <p className="p-5 text-center text-gray-400 text-xs leading-relaxed">
              {busqueda
                ? 'Sin resultados para tu búsqueda'
                : 'No tienes conversaciones aún.\nUsa "Iniciar Nueva Conversación" para contactar a un suscriptor.'}
            </p>
          ) : (
            convsFiltradas.map(c => (
              <div
                key={c.id_suscriptor}
                onClick={() => setSuscActivoId(c.id_suscriptor)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors
                  ${suscActivoId === c.id_suscriptor ? 'bg-blue-500' : 'hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-center gap-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar inicial */}
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${suscActivoId === c.id_suscriptor ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {c.nombre_suscriptor.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${suscActivoId === c.id_suscriptor ? 'text-white' : 'text-black'}`}>
                          {c.nombre_suscriptor}
                        </span>
                        {c.no_leidos > 0 && (
                          <span className="shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-px">
                            {c.no_leidos}
                          </span>
                        )}
                      </div>
                      {c.ultimo_mensaje ? (
                        <p className={`text-xs truncate
                          ${c.no_leidos > 0 ? 'text-red-400 font-semibold' : suscActivoId === c.id_suscriptor ? 'text-blue-100' : 'text-gray-500'}`}>
                          {c.no_leidos > 0
                            ? `¡${c.no_leidos} mensaje${c.no_leidos > 1 ? 's' : ''} nuevo${c.no_leidos > 1 ? 's' : ''}!`
                            : `${c.ultimo_enviado_por === 'personal' ? 'Tú: ' : ''}${c.ultimo_mensaje}`}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${suscActivoId === c.id_suscriptor ? 'text-blue-200' : 'text-gray-400'}`}>
                          Sin mensajes aún
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] shrink-0 self-start mt-0.5
                    ${suscActivoId === c.id_suscriptor ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatHora(c.ultimo_mensaje_en)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════════════ ÁREA CHAT ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {suscActivoId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
            <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-medium text-gray-400">Selecciona una conversación</p>
            <p className="text-xs text-gray-300">o inicia una nueva desde el panel izquierdo</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-white shrink-0">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                {suscActivo?.nombre_suscriptor.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#ea580c] text-sm leading-tight truncate">
                  {suscActivo?.nombre_suscriptor ?? 'Suscriptor'}{' '}
                  <span className="text-gray-400 font-normal text-xs">(Suscriptor)</span>
                </p>
                <p className="text-[11px] text-gray-400 truncate">{suscActivo?.correo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {escribiendo && (
                  <p className="text-xs text-gray-400 italic animate-pulse">escribiendo...</p>
                )}
                <span className="text-xs text-gray-300">{user?.nombre?.split(' ')[0]}</span>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {cargandoMsgs ? (
                <Spinner size="sm" text="Cargando mensajes..." />
              ) : mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                  <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">No hay mensajes aún</p>
                  <p className="text-xs text-gray-300">Escribe el primer mensaje para empezar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-center text-gray-400 text-xs mb-4 select-none">— Historial cargado —</div>
                  {mensajes.map(msg => {
                    const esMio = msg.enviado_por === 'personal'
                    return (
                      <div key={msg.id_mensaje} className={`flex items-end gap-2 ${esMio ? 'justify-end' : 'justify-start'}`}>
                        {!esMio && (
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {suscActivo?.nombre_suscriptor.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-sm lg:max-w-md xl:max-w-lg px-4 py-2.5 rounded-2xl text-sm shadow-sm
                          ${esMio ? 'bg-green-100 text-black rounded-br-sm' : 'bg-white border border-gray-200 text-black rounded-bl-sm'}`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.contenido}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-400">
                              {formatHora(msg.enviado_en)}
                              {esMio && ` · ${user?.nombre?.split(' ')[0] ?? 'Tú'}`}
                            </span>
                            {esMio && (
                              <span className={`text-[11px] font-bold leading-none ${msg.leido ? 'text-blue-400' : 'text-gray-300'}`}>
                                {msg.leido ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Indicador de escritura */}
                  {escribiendo && (
                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">
                        {suscActivo?.nombre_suscriptor.charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-5 py-3 border-t border-gray-200 flex gap-3 bg-white shrink-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe tu mensaje aquí..."
                value={texto}
                onChange={onEscribir}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() } }}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black bg-gray-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
              />
              <button
                onClick={enviarMensaje}
                disabled={!texto.trim() || enviando}
                className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2 shrink-0"
              >
                {enviando
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                }
                Enviar
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══════════════ MODAL NUEVA CONVERSACIÓN ══════════════ */}
      {modalNuevo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalNuevo(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Iniciar Conversación</h3>
                <p className="text-xs text-gray-400 mt-0.5">Suscriptores de tu sucursal</p>
              </div>
              <button
                onClick={() => setModalNuevo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors"
              >✕</button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={buscandoNuevo}
                onChange={e => setBuscandoNuevo(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {cargandoDisp ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
                </div>
              ) : suscDispFiltrados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  {buscandoNuevo ? 'Sin resultados' : 'No hay suscriptores en tu sucursal'}
                </p>
              ) : (
                suscDispFiltrados.map(s => (
                  <div
                    key={s.id_suscriptor}
                    onClick={() => iniciarConversacion(s)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {s.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{s.nombre}</p>
                      <p className="text-xs text-gray-400 truncate">{s.correo}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
                      ${s.tiene_chat ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {s.tiene_chat ? 'Activo' : 'Nuevo'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
