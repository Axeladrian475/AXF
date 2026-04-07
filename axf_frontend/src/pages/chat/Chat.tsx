// ============================================================================
//  pages/chat/Chat.tsx  — v2 "WhatsApp 2"
// ============================================================================
import {
  useState, useEffect, useRef, useContext, useCallback, useMemo,
} from 'react'
import { io, Socket } from 'socket.io-client'
import axiosClient from '../../api/axiosClient'
import { AuthContext } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Conversacion {
  id_suscriptor:       number
  nombre_suscriptor:   string
  correo:              string
  ultimo_mensaje:      string | null
  ultimo_mensaje_en:   string | null
  ultimo_enviado_por:  'personal' | 'suscriptor' | null
  no_leidos:           number
}

interface Mensaje {
  id_mensaje:            number
  enviado_por:           'personal' | 'suscriptor'
  contenido:             string
  leido:                 number
  entregado:             number
  editado_en:            string | null
  borrado_para:          'nadie' | 'emisor' | 'todos'
  id_respuesta:          number | null
  respuesta_contenido:   string | null
  respuesta_enviado_por: 'personal' | 'suscriptor' | null
  enviado_en:            string
}

interface SuscriptorDisponible {
  id_suscriptor: number
  nombre:        string
  correo:        string
  tiene_chat:    number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatHora(iso: string | null): string {
  if (!iso) return ''
  const d   = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const mismaFecha = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (mismaFecha(d, hoy))  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (mismaFecha(d, ayer)) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatFechaSeparador(iso: string): string {
  const d   = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const mismaFecha = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (mismaFecha(d, hoy))  return 'Hoy'
  if (mismaFecha(d, ayer)) return 'Ayer'
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fechaDia(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Chat() {
  const { token, user } = useContext(AuthContext)

  // Estado conversaciones
  const [conversaciones,   setConversaciones]   = useState<Conversacion[]>([])
  const [suscActivoId,     setSuscActivoId]      = useState<number | null>(null)
  const [mensajes,         setMensajes]          = useState<Mensaje[]>([])
  const [hayMasAntiguos,   setHayMasAntiguos]    = useState(false)
  const [cargandoAntiguos, setCargandoAntiguos]  = useState(false)
  const [busqueda,         setBusqueda]          = useState('')
  const [cargandoConvs,    setCargandoConvs]     = useState(true)
  const [cargandoMsgs,     setCargandoMsgs]      = useState(false)
  const [enviando,         setEnviando]          = useState(false)
  const [escribiendo,      setEscribiendo]       = useState(false)
  const [wsConectado,      setWsConectado]       = useState(false)

  // Texto y reply
  const [texto,            setTexto]             = useState('')
  const [replyMsg,         setReplyMsg]          = useState<Mensaje | null>(null)
  const [editandoMsg,      setEditandoMsg]       = useState<Mensaje | null>(null)

  // Modal nueva conversacion
  const [modalNuevo,       setModalNuevo]        = useState(false)
  const [suscDisp,         setSuscDisp]          = useState<SuscriptorDisponible[]>([])
  const [buscandoNuevo,    setBuscandoNuevo]     = useState('')
  const [cargandoDisp,     setCargandoDisp]      = useState(false)

  // Menú contextual
  const [ctxMenu, setCtxMenu] = useState<{
    x: number; y: number; msg: Mensaje
  } | null>(null)

  // Presencia online
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({})

  const socketRef         = useRef<Socket | null>(null)
  const msgEndRef         = useRef<HTMLDivElement>(null)
  const textareaRef       = useRef<HTMLTextAreaElement>(null)
  const escribiendoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suscActivoRef     = useRef<number | null>(null)
  const offsetRef         = useRef(0)
  const msgContainerRef   = useRef<HTMLDivElement>(null)
  const errorConvs        = useRef<string | null>(null)

  useEffect(() => { suscActivoRef.current = suscActivoId }, [suscActivoId])

  const suscActivo = useMemo(
    () => conversaciones.find(c => c.id_suscriptor === suscActivoId) ?? null,
    [conversaciones, suscActivoId]
  )

  // ── 1. Socket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socket.on('connect',       () => {
      setWsConectado(true)
      // Al reconectar, marcar mensajes pendientes como entregados
      socket.emit('chat:marcar_entregado', {})
    })
    socket.on('disconnect',    () => setWsConectado(false))
    socket.on('connect_error', () => setWsConectado(false))

    // Presencia
    socket.on('chat:online', ({ rol, id, online }: { rol: string; id: number; online: boolean }) => {
      setOnlineStatus(prev => ({ ...prev, [`${rol}:${id}`]: online }))
    })

    // Mensaje nuevo
    socket.on('chat:mensaje_nuevo', ({ id_suscriptor, mensaje }: { id_suscriptor: number; mensaje: Mensaje }) => {
      if (suscActivoRef.current === id_suscriptor) {
        setMensajes(prev => [...prev, mensaje])
        socket.emit('chat:leer', { id_suscriptor })
      }
      setConversaciones(prev => {
        const existe = prev.find(c => c.id_suscriptor === id_suscriptor)
        const updated = existe
          ? prev.map(c => c.id_suscriptor === id_suscriptor
              ? {
                  ...c,
                  ultimo_mensaje:     mensaje.contenido,
                  ultimo_mensaje_en:  mensaje.enviado_en,
                  ultimo_enviado_por: mensaje.enviado_por,
                  no_leidos: suscActivoRef.current === id_suscriptor ? 0 : c.no_leidos + 1,
                }
              : c)
          : prev
        return [...updated].sort(
          (a, b) => new Date(b.ultimo_mensaje_en ?? 0).getTime() - new Date(a.ultimo_mensaje_en ?? 0).getTime()
        )
      })
    })

    // Leídos
    socket.on('chat:mensajes_leidos', ({ id_suscriptor }: { id_suscriptor: number }) => {
      if (suscActivoRef.current === id_suscriptor) {
        setMensajes(prev => prev.map(m =>
          m.enviado_por === 'personal' ? { ...m, leido: 1, entregado: 1 } : m
        ))
      }
    })

    // Entregado individual
    socket.on('chat:entregado', ({ id_mensaje }: { id_mensaje: number }) => {
      setMensajes(prev => prev.map(m => m.id_mensaje === id_mensaje ? { ...m, entregado: 1 } : m))
    })

    // Entregado bulk (al reconectar)
    socket.on('chat:entregado_bulk', ({ id_personal, id_suscriptor }: { id_personal: number; id_suscriptor: number }) => {
      if (suscActivoRef.current === id_suscriptor) {
        setMensajes(prev => prev.map(m =>
          m.enviado_por === 'personal' ? { ...m, entregado: 1 } : m
        ))
      }
    })

    // Mensaje editado
    socket.on('chat:mensaje_editado', ({ id_mensaje, nuevo_contenido, editado_en }: {
      id_mensaje: number; nuevo_contenido: string; editado_en: string
    }) => {
      setMensajes(prev => prev.map(m =>
        m.id_mensaje === id_mensaje ? { ...m, contenido: nuevo_contenido, editado_en } : m
      ))
    })

    // Mensaje eliminado
    socket.on('chat:mensaje_eliminado', ({ id_mensaje }: { id_mensaje: number }) => {
      setMensajes(prev => prev.map(m =>
        m.id_mensaje === id_mensaje ? { ...m, borrado_para: 'todos' } : m
      ))
    })

    // Escribiendo — CORRECCIÓN: solo activar si es la conversación activa
    socket.on('chat:escribiendo', (data: { id_personal?: number; id_suscriptor?: number }) => {
      if (data.id_suscriptor === suscActivoRef.current) setEscribiendo(true)
    })
    socket.on('chat:parar_escribir', (data: { id_personal?: number; id_suscriptor?: number }) => {
      if (data.id_suscriptor === suscActivoRef.current) setEscribiendo(false)
    })

    socketRef.current = socket
    return () => { socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── 2. Cargar conversaciones ──────────────────────────────────────────
  const cargarConversaciones = useCallback(async () => {
    setCargandoConvs(true)
    try {
      const { data } = await axiosClient.get('/chat/conversaciones')
      setConversaciones(data)
    } catch {
      errorConvs.current = 'Error al cargar conversaciones'
    } finally {
      setCargandoConvs(false)
    }
  }, [])

  useEffect(() => { cargarConversaciones() }, [cargarConversaciones])

  // ── 3. Cargar mensajes ────────────────────────────────────────────────
  useEffect(() => {
    if (suscActivoId === null) { setMensajes([]); return }
    let cancelado = false
    offsetRef.current = 0

    const cargar = async () => {
      setCargandoMsgs(true)
      try {
        const { data } = await axiosClient.get(`/chat/mensajes/${suscActivoId}?limite=50&offset=0`)
        if (!cancelado) {
          setMensajes(data.mensajes ?? [])
          setHayMasAntiguos(data.paginacion?.hay_mas ?? false)
          offsetRef.current = data.mensajes?.length ?? 0
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

  // ── 4. Cargar mensajes más antiguos (scroll hacia arriba) ─────────────
  const cargarAntiguos = useCallback(async () => {
    if (!suscActivoId || cargandoAntiguos || !hayMasAntiguos) return
    setCargandoAntiguos(true)
    const container = msgContainerRef.current
    const scrollBefore = container?.scrollHeight ?? 0

    try {
      const { data } = await axiosClient.get(
        `/chat/mensajes/${suscActivoId}?limite=50&offset=${offsetRef.current}`
      )
      const nuevos: Mensaje[] = data.mensajes ?? []
      setMensajes(prev => [...nuevos, ...prev])
      setHayMasAntiguos(data.paginacion?.hay_mas ?? false)
      offsetRef.current += nuevos.length

      // Mantener posición de scroll
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - scrollBefore
        }
      })
    } catch {
      // silencioso
    } finally {
      setCargandoAntiguos(false)
    }
  }, [suscActivoId, cargandoAntiguos, hayMasAntiguos])

  // Detectar scroll al tope para cargar antiguos
  const onScroll = useCallback(() => {
    const container = msgContainerRef.current
    if (container && container.scrollTop < 80) {
      cargarAntiguos()
    }
  }, [cargarAntiguos])

  // ── 5. Scroll al fondo en mensajes nuevos ─────────────────────────────
  useEffect(() => {
    if (!cargandoAntiguos) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensajes.length, escribiendo, cargandoAntiguos])

  // ── 6. Auto-resize textarea ───────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [texto])

  // ── 7. Enviar / Editar mensaje ────────────────────────────────────────
  const enviarOMEditar = useCallback(() => {
    const contenido = texto.trim()
    if (!contenido || enviando) return

    // MODO EDITAR
    if (editandoMsg) {
      if (contenido === editandoMsg.contenido) { setEditandoMsg(null); setTexto(''); return }
      setEnviando(true)
      socketRef.current?.emit(
        'chat:editar',
        { id_mensaje: editandoMsg.id_mensaje, nuevo_contenido: contenido },
        (resp: { ok: boolean }) => {
          setEnviando(false)
          if (resp?.ok) {
            setMensajes(prev => prev.map(m =>
              m.id_mensaje === editandoMsg.id_mensaje
                ? { ...m, contenido, editado_en: new Date().toISOString() }
                : m
            ))
          }
          setEditandoMsg(null)
          setTexto('')
        }
      )
      return
    }

    // MODO ENVIAR
    if (suscActivoId === null) return
    setEnviando(true)

    const payload: Record<string, unknown> = {
      id_suscriptor: suscActivoId,
      contenido,
    }
    if (replyMsg) {
      payload.id_respuesta          = replyMsg.id_mensaje
      payload.respuesta_contenido   = replyMsg.contenido.substring(0, 200)
      payload.respuesta_enviado_por = replyMsg.enviado_por
    }

    if (!wsConectado) {
      axiosClient.post('/chat/mensajes', payload)
        .then(({ data }) => {
          setMensajes(prev => [...prev, data.mensaje])
        })
        .catch(() => {})
        .finally(() => { setEnviando(false) })
    } else {
      socketRef.current?.emit(
        'chat:enviar',
        payload,
        (resp: { ok: boolean; mensaje?: Mensaje }) => {
          setEnviando(false)
          if (resp?.ok && resp.mensaje) {
            setMensajes(prev => [...prev, resp.mensaje!])
            setConversaciones(prev =>
              prev.map(c => c.id_suscriptor === suscActivoId
                ? { ...c, ultimo_mensaje: contenido, ultimo_mensaje_en: resp.mensaje!.enviado_en, ultimo_enviado_por: 'personal' as const }
                : c
              ).sort((a, b) =>
                new Date(b.ultimo_mensaje_en ?? 0).getTime() - new Date(a.ultimo_mensaje_en ?? 0).getTime()
              )
            )
          }
        }
      )
    }
    setTexto('')
    setReplyMsg(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [texto, suscActivoId, enviando, wsConectado, replyMsg, editandoMsg])

  // ── 8. Indicador escribiendo ──────────────────────────────────────────
  const onEscribir = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTexto(e.target.value)
    if (suscActivoId === null) return
    socketRef.current?.emit('chat:escribiendo', { id_suscriptor: suscActivoId })
    if (escribiendoTimer.current) clearTimeout(escribiendoTimer.current)
    escribiendoTimer.current = setTimeout(() => {
      socketRef.current?.emit('chat:parar_escribir', { id_suscriptor: suscActivoId })
    }, 2000)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      enviarOMEditar()
    }
    // Ctrl+Enter o Shift+Enter = salto de línea (comportamiento por defecto)
  }

  // ── 9. Eliminar mensaje ───────────────────────────────────────────────
  const eliminarMensaje = useCallback((msg: Mensaje, paraTodos: boolean) => {
    setCtxMenu(null)
    socketRef.current?.emit(
      'chat:eliminar',
      { id_mensaje: msg.id_mensaje, para_todos: paraTodos },
      (resp: { ok: boolean }) => {
        if (resp?.ok) {
          if (paraTodos) {
            setMensajes(prev => prev.map(m =>
              m.id_mensaje === msg.id_mensaje ? { ...m, borrado_para: 'todos' } : m
            ))
          } else {
            setMensajes(prev => prev.filter(m => m.id_mensaje !== msg.id_mensaje))
          }
        }
      }
    )
  }, [])

  // ── 10. Modal nueva conversación ──────────────────────────────────────
  const abrirModal = async () => {
    setModalNuevo(true); setBuscandoNuevo(''); setCargandoDisp(true)
    try {
      const { data } = await axiosClient.get('/chat/suscriptores-disponibles')
      setSuscDisp(data)
    } catch { setSuscDisp([]) }
    finally { setCargandoDisp(false) }
  }

  const iniciarConversacion = (s: SuscriptorDisponible) => {
    setModalNuevo(false)
    if (!conversaciones.find(c => c.id_suscriptor === s.id_suscriptor)) {
      setConversaciones(prev => [{
        id_suscriptor: s.id_suscriptor, nombre_suscriptor: s.nombre,
        correo: s.correo, ultimo_mensaje: null, ultimo_mensaje_en: null,
        ultimo_enviado_por: null, no_leidos: 0,
      }, ...prev])
    }
    setSuscActivoId(s.id_suscriptor)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // ── 11. Separadores de fecha en mensajes ──────────────────────────────
  const mensajesConSeparadores = useMemo(() => {
    const items: Array<{ type: 'fecha'; fecha: string } | { type: 'msg'; msg: Mensaje }> = []
    let lastDay = ''
    for (const msg of mensajes) {
      const dia = fechaDia(msg.enviado_en)
      if (dia !== lastDay) {
        items.push({ type: 'fecha', fecha: msg.enviado_en })
        lastDay = dia
      }
      items.push({ type: 'msg', msg })
    }
    return items
  }, [mensajes])

  // ── 12. Filtros ───────────────────────────────────────────────────────
  const convsFiltradas = conversaciones.filter(c =>
    c.nombre_suscriptor.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.correo.toLowerCase().includes(busqueda.toLowerCase())
  )
  const suscDispFiltrados = suscDisp.filter(s =>
    s.nombre.toLowerCase().includes(buscandoNuevo.toLowerCase()) ||
    s.correo.toLowerCase().includes(buscandoNuevo.toLowerCase())
  )

  // ── Iconos de estado del mensaje ──────────────────────────────────────
  const TicksIcon = ({ msg }: { msg: Mensaje }) => {
    if (msg.borrado_para === 'todos') return null
    if (msg.leido)      return <span className="text-blue-400 text-xs font-bold">✓✓</span>
    if (msg.entregado)  return <span className="text-gray-400 text-xs font-bold">✓✓</span>
    return <span className="text-gray-300 text-xs font-bold">✓</span>
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-[calc(100vh-60px)] bg-white overflow-hidden rounded-lg shadow-md -m-5"
      onClick={() => ctxMenu && setCtxMenu(null)}
    >
      {/* ══════════ SIDEBAR ══════════ */}
      <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-black text-sm">Mensajes</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors ${wsConectado ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-[9px] text-gray-400">{wsConectado ? 'Conectado' : 'Sin conexión'}</span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black bg-white focus:outline-none focus:border-orange-400 mb-2"
          />
          <button
            onClick={abrirModal}
            className="w-full bg-[#1e293b] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-[#0f172a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargandoConvs ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : convsFiltradas.length === 0 ? (
            <p className="p-5 text-center text-gray-400 text-xs leading-relaxed">
              {busqueda ? 'Sin resultados' : 'Sin conversaciones aún.'}
            </p>
          ) : convsFiltradas.map(c => (
            <div
              key={c.id_suscriptor}
              onClick={() => setSuscActivoId(c.id_suscriptor)}
              className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-all
                ${suscActivoId === c.id_suscriptor ? 'bg-blue-500' : 'hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-center gap-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                      ${suscActivoId === c.id_suscriptor ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {c.nombre_suscriptor.charAt(0).toUpperCase()}
                    </div>
                    {/* Punto online (si el suscriptor está conectado) */}
                    {onlineStatus[`suscriptor:${c.id_suscriptor}`] && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                    )}
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
                    <p className={`text-xs truncate
                      ${c.no_leidos > 0 ? 'font-semibold text-orange-400' : suscActivoId === c.id_suscriptor ? 'text-blue-100' : 'text-gray-500'}`}>
                      {c.ultimo_mensaje
                        ? (c.no_leidos > 0
                            ? `${c.no_leidos} mensaje${c.no_leidos > 1 ? 's' : ''} nuevo${c.no_leidos > 1 ? 's' : ''}`
                            : `${c.ultimo_enviado_por === 'personal' ? 'Tú: ' : ''}${c.ultimo_mensaje}`)
                        : 'Sin mensajes aún'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] shrink-0 ${suscActivoId === c.id_suscriptor ? 'text-blue-200' : 'text-gray-400'}`}>
                  {formatHora(c.ultimo_mensaje_en)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ ÁREA CHAT ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {suscActivoId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
            <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm text-gray-400">Selecciona una conversación</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-white shrink-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                  {suscActivo?.nombre_suscriptor.charAt(0).toUpperCase() ?? '?'}
                </div>
                {onlineStatus[`suscriptor:${suscActivoId}`] && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#ea580c] text-sm leading-tight truncate">
                  {suscActivo?.nombre_suscriptor ?? 'Suscriptor'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {onlineStatus[`suscriptor:${suscActivoId}`] ? (
                    <span className="text-green-500 font-medium">En línea</span>
                  ) : escribiendo ? (
                    <span className="text-gray-400 italic animate-pulse">escribiendo...</span>
                  ) : (
                    suscActivo?.correo
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">{user?.nombre?.split(' ')[0]}</span>
              </div>
            </div>

            {/* Mensajes */}
            <div
              ref={msgContainerRef}
              onScroll={onScroll}
              className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col"
            >
              {/* Botón cargar más */}
              {hayMasAntiguos && (
                <div className="flex justify-center mb-3 shrink-0">
                  <button
                    onClick={cargarAntiguos}
                    disabled={cargandoAntiguos}
                    className="text-xs text-blue-500 hover:text-blue-700 bg-white border border-blue-200 rounded-full px-4 py-1.5 shadow-sm hover:shadow transition-all disabled:opacity-50"
                  >
                    {cargandoAntiguos ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Cargando...
                      </span>
                    ) : '↑ Cargar mensajes anteriores'}
                  </button>
                </div>
              )}

              {cargandoMsgs ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner size="sm" text="Cargando mensajes..." />
                </div>
              ) : mensajes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <p className="text-sm">No hay mensajes aún</p>
                  <p className="text-xs text-gray-300">Escribe el primer mensaje</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {mensajesConSeparadores.map((item, idx) => {
                    if (item.type === 'fecha') {
                      return (
                        <div key={`sep-${idx}`} className="flex items-center justify-center my-3">
                          <span className="bg-gray-200 text-gray-500 text-[11px] px-3 py-0.5 rounded-full select-none">
                            {formatFechaSeparador(item.fecha)}
                          </span>
                        </div>
                      )
                    }

                    const msg = item.msg
                    const esMio = msg.enviado_por === 'personal'
                    const esBorrado = msg.borrado_para === 'todos'

                    return (
                      <div
                        key={msg.id_mensaje}
                        className={`flex items-end gap-2 group ${esMio ? 'justify-end' : 'justify-start'}`}
                        onContextMenu={e => {
                          if (!esBorrado) {
                            e.preventDefault()
                            setCtxMenu({ x: e.clientX, y: e.clientY, msg })
                          }
                        }}
                      >
                        {!esMio && (
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0 mb-1">
                            {suscActivo?.nombre_suscriptor.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className={`max-w-sm lg:max-w-md xl:max-w-lg flex flex-col ${esMio ? 'items-end' : 'items-start'}`}>
                          {/* Burbuja */}
                          <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm relative
                            ${esBorrado
                              ? 'bg-gray-100 text-gray-400 italic border border-gray-200'
                              : esMio
                                ? 'bg-green-100 text-black rounded-br-sm'
                                : 'bg-white border border-gray-200 text-black rounded-bl-sm'
                            }`}
                          >
                            {/* Cita/Reply */}
                            {!esBorrado && msg.id_respuesta && msg.respuesta_contenido && (
                              <div className={`mb-2 pl-2 border-l-2 border-orange-400 rounded-sm
                                ${esMio ? 'bg-green-50' : 'bg-gray-50'} p-1.5`}>
                                <p className="text-[10px] font-semibold text-orange-500 mb-0.5">
                                  {msg.respuesta_enviado_por === 'personal' ? 'Tú' : suscActivo?.nombre_suscriptor}
                                </p>
                                <p className="text-[11px] text-gray-500 line-clamp-2">{msg.respuesta_contenido}</p>
                              </div>
                            )}

                            {/* Contenido */}
                            {esBorrado ? (
                              <p className="text-xs">🚫 Mensaje eliminado</p>
                            ) : (
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.contenido}</p>
                            )}

                            {/* Footer: hora + editado + ticks */}
                            {!esBorrado && (
                              <div className={`flex items-center gap-1 mt-0.5 ${esMio ? 'justify-end' : 'justify-start'}`}>
                                {msg.editado_en && (
                                  <span className="text-[9px] text-gray-400 italic">editado</span>
                                )}
                                <span className="text-[10px] text-gray-400">{formatHora(msg.enviado_en)}</span>
                                {esMio && <TicksIcon msg={msg} />}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón reply rápido al hover */}
                        {!esBorrado && (
                          <button
                            onClick={() => { setReplyMsg(msg); textareaRef.current?.focus() }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-1 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500`}
                            title="Responder"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Indicador escribiendo */}
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

            {/* Banner de reply/editar */}
            {(replyMsg || editandoMsg) && (
              <div className="px-5 py-2 border-t border-gray-100 bg-orange-50 flex items-center gap-3 shrink-0">
                <div className="flex-1 border-l-2 border-orange-400 pl-3">
                  <p className="text-[11px] font-semibold text-orange-500">
                    {editandoMsg ? '✏️ Editando mensaje' : `↩️ Respondiendo a ${replyMsg?.enviado_por === 'personal' ? 'ti mismo' : suscActivo?.nombre_suscriptor}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{editandoMsg?.contenido || replyMsg?.contenido}</p>
                </div>
                <button
                  onClick={() => { setReplyMsg(null); setEditandoMsg(null); setTexto('') }}
                  className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-xs shrink-0"
                >✕</button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 flex gap-3 bg-white shrink-0 items-end">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={editandoMsg ? 'Editar mensaje...' : 'Escribe un mensaje... (Enter para enviar, Shift+Enter para salto de línea)'}
                value={texto}
                onChange={onEscribir}
                onKeyDown={onKeyDown}
                style={{ resize: 'none', overflow: 'hidden' }}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black bg-gray-50 focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
              />
              <button
                onClick={enviarOMEditar}
                disabled={!texto.trim() || enviando}
                className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2 shrink-0 self-end"
              >
                {enviando
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : editandoMsg
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                }
                {editandoMsg ? 'Guardar' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══════════ MODAL NUEVA CONVERSACIÓN ══════════ */}
      {modalNuevo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalNuevo(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Nueva Conversación</h3>
                <p className="text-xs text-gray-400 mt-0.5">Suscriptores de tu sucursal</p>
              </div>
              <button onClick={() => setModalNuevo(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
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
                  {buscandoNuevo ? 'Sin resultados' : 'No hay suscriptores disponibles'}
                </p>
              ) : suscDispFiltrados.map(s => (
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MENÚ CONTEXTUAL ══════════ */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-40 text-sm"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {/* Responder */}
          <button
            onClick={() => { setReplyMsg(ctxMenu.msg); setCtxMenu(null); textareaRef.current?.focus() }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <span>↩️</span> Responder
          </button>

          {/* Copiar */}
          <button
            onClick={() => { navigator.clipboard.writeText(ctxMenu.msg.contenido); setCtxMenu(null) }}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <span>📋</span> Copiar texto
          </button>

          {/* Editar (solo mis mensajes) */}
          {ctxMenu.msg.enviado_por === 'personal' && (
            <button
              onClick={() => {
                setEditandoMsg(ctxMenu.msg)
                setTexto(ctxMenu.msg.contenido)
                setCtxMenu(null)
                textareaRef.current?.focus()
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <span>✏️</span> Editar
            </button>
          )}

          {/* Eliminar para mí */}
          <button
            onClick={() => eliminarMensaje(ctxMenu.msg, false)}
            className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-500"
          >
            <span>🗑️</span> Eliminar para mí
          </button>

          {/* Eliminar para todos (solo mis mensajes) */}
          {ctxMenu.msg.enviado_por === 'personal' && (
            <button
              onClick={() => eliminarMensaje(ctxMenu.msg, true)}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 font-semibold"
            >
              <span>🚫</span> Eliminar para todos
            </button>
          )}
        </div>
      )}
    </div>
  )
}