import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { Library, ChevronDown, ChevronUp, GraduationCap, Bell, Users, Send, LogOut } from 'lucide-react'
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
  const [showUserMenu, setShowUserMenu] = useState(false)



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
        {/* Library Button */}
        <button
          onClick={() => router.push('/')}
          className="header-button"
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Library size={16} />
          <span>Library</span>
        </button>

        {/* Tutorial Button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="header-button"
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <GraduationCap size={16} />
          <span>Tutorial</span>
        </button>

        {/* User Menu Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="header-button user-menu-button"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {session.user.image && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <Image
                  src={session.user.image}
                  alt="Avatar"
                  width={28}
                  height={28}
                  style={{ objectFit: 'cover' }}
                  unoptimized={!session.user.image.startsWith('/')}
                />
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', lineHeight: '1.2' }}>
                {session.user.name || session.user.email}
              </div>
            </div>
            {showUserMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                onClick={() => setShowUserMenu(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
              />
              <div className="user-dropdown-menu" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                minWidth: '220px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(62, 106, 225, 0.1)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {session.user.name || 'User'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {session.user.email}
                  </div>
                </div>

                <div style={{ padding: '4px 0' }}>
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowUserMenu(false);
                    }}
                    className="dropdown-item"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <Bell size={16} />
                    Notifications
                  </button>

                  <button
                    onClick={() => {
                      setShowFriends(!showFriends);
                      setShowUserMenu(false);
                    }}
                    className="dropdown-item"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <Users size={16} />
                    Friends
                  </button>

                  <button
                    onClick={() => {
                      setShowTelegramPanel(true);
                      setShowUserMenu(false);
                    }}
                    className="dropdown-item"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <Send size={16} />
                    Telegram
                  </button>

                  <div style={{
                    height: '1px',
                    background: 'var(--border-color)',
                    margin: '4px 0'
                  }}></div>

                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/auth/signin', redirect: true });
                    }}
                    className="dropdown-item"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontWeight: '500'
                    }}
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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