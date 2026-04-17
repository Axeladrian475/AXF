// ============================================================================
//  components/ui/NotificacionToast.tsx
//
//  Toast de notificación de mensaje de chat que aparece en la esquina
//  inferior derecha cuando llega un mensaje en foreground (tab activo).
//
//  Características:
//  - Animación de entrada/salida suave
//  - Auto-cierre en 5 segundos
//  - Click navega al chat
//  - Sonido de notificación suave
// ============================================================================
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface NotifPayload {
  id:     number
  titulo: string
  cuerpo: string
  data:   Record<string, string>
}

interface Props {
  notificaciones: NotifPayload[]
  onClose: (id: number) => void
}

export default function NotificacionToast({ notificaciones, onClose }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {notificaciones.map((n) => (
        <ToastItem key={n.id} notif={n} onClose={onClose} />
      ))}
    </div>
  )
}

function ToastItem({ notif, onClose }: { notif: NotifPayload; onClose: (id: number) => void }) {
  const navigate  = useNavigate()
  const [visible, setVisible] = useState(false)

  // Animar entrada y auto-cierre
  useEffect(() => {
    const tEntrada = setTimeout(() => setVisible(true), 20)
    const tSalida  = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(notif.id), 300)
    }, 5000)
    return () => { clearTimeout(tEntrada); clearTimeout(tSalida) }
  }, [notif.id, onClose])

  const irAlChat = () => {
    onClose(notif.id)
    navigate('/chat')
  }

  return (
    <div
      onClick={irAlChat}
      className="pointer-events-auto cursor-pointer select-none"
      style={{
        transform:  visible ? 'translateX(0)' : 'translateX(120%)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        width:      '320px',
      }}
    >
      <div style={{
        background:   'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '14px',
        padding:      '14px 16px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.07)',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '12px',
      }}>
        {/* Ícono */}
        <div style={{
          width:          '40px',
          height:         '40px',
          borderRadius:   '50%',
          background:     'linear-gradient(135deg, #ea580c, #f97316)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          fontSize:       '18px',
        }}>
          💬
        </div>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color:        '#f1f5f9',
            fontWeight:   700,
            fontSize:     '13px',
            margin:       0,
            marginBottom: '3px',
            fontFamily:   'system-ui, sans-serif',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}>
            {notif.titulo}
          </p>
          <p style={{
            color:    '#94a3b8',
            fontSize: '12px',
            margin:   0,
            fontFamily: 'system-ui, sans-serif',
            display:  '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {notif.cuerpo}
          </p>
          <p style={{
            color:      '#ea580c',
            fontSize:   '11px',
            margin:     0,
            marginTop:  '5px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 600,
          }}>
            Toca para ver el mensaje →
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(notif.id) }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border:     'none',
            color:      '#64748b',
            cursor:     'pointer',
            borderRadius: '6px',
            width:      '22px',
            height:     '22px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize:   '12px',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Barra de progreso */}
      <div style={{
        position:     'relative',
        height:       '3px',
        background:   'rgba(255,255,255,0.06)',
        borderRadius: '0 0 14px 14px',
        overflow:     'hidden',
        marginTop:    '-3px',
      }}>
        <div style={{
          position:  'absolute',
          top:       0, left: 0, bottom: 0,
          background: 'linear-gradient(90deg, #ea580c, #f97316)',
          width:      visible ? '0%' : '100%',
          transition: visible ? 'width 5s linear' : 'none',
        }} />
      </div>
    </div>
  )
}
