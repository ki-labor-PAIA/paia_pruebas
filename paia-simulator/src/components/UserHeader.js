import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import TelegramPanel from './TelegramPanel'
import NotificationPanel from './NotificationPanel'
import FriendsPanel from './FriendsPanel'
import SpotlightTour from './tutorial/SpotlightTour'
import tutorialSteps from './tutorial/steps'

export default function UserHeader() {
  const { data: session } = useSession()
  const router = useRouter()
  const [showTelegramPanel, setShowTelegramPanel] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  if (!session) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>PAIA</h1>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Personal AI Agent System
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {session.user.image && (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <Image 
                src={session.user.image} 
                alt="Avatar"
                width={32}
                height={32}
                style={{
                  objectFit: 'cover'
                }}
                unoptimized={!session.user.image.startsWith('/')} // Only optimize local images
              />
            </div>
          )}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {session.user.name || session.user.email}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {session.user.email}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowTutorial(true)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s',
            marginRight: '10px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          🎓 Tutorial
        </button>

        <button
          onClick={() => router.push('/')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s',
            marginRight: '10px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          📚 Library
        </button>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s',
            marginRight: '10px',
            position: 'relative'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          📢 Notifications
          {/* Badge de notificaciones no leídas - TODO: conectar con API */}
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            backgroundColor: '#EF4444',
            color: 'white',
            borderRadius: '50%',
            width: '12px',
            height: '12px',
            fontSize: '8px',
            display: 'none' // Se mostrará cuando haya notificaciones
          }}>
            !
          </span>
        </button>
        
        <button
          onClick={() => setShowFriends(!showFriends)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s',
            marginRight: '10px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          👥 Friends
        </button>
        
        <button
          onClick={() => setShowTelegramPanel(true)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s',
            marginRight: '10px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          📱 Telegram
        </button>
        
        <button
          onClick={() => signOut()}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          Log Out
        </button>
      </div>
      
      {showTelegramPanel && (
        <TelegramPanel onClose={() => setShowTelegramPanel(false)} />
      )}
      
      <NotificationPanel 
        userId={session?.user?.id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      
      <FriendsPanel
        userId={session?.user?.id}
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
      />

      {showTutorial && (
        <SpotlightTour
          steps={tutorialSteps}
          forceOpen={true}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </div>
  )
}