import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isLogin) {
      // Login
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      
      if (result?.error) {
        setError('Credenciales inválidas')
      } else {
        router.push('/')
      }
    } else {
      // Registro
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          // Automáticamente hacer login después del registro
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false
          })
          
          if (!result?.error) {
            router.push('/')
          }
        } else {
          setError(data.message || 'Error al registrarse')
        }
      } catch (error) {
        setError('Error de conexión')
      }
    }
    
    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <>
      <Head>
        <title>{isLogin ? 'Iniciar Sesión' : 'Registrarse'} - PAIA</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Overlay oscuro */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(2px)',
          zIndex: 0
        }} />

        {/* Efecto glow */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at 30% 30%, rgba(214, 107, 255, 0.15), transparent 70%)',
          zIndex: 0,
          animation: 'glowMove 25s ease-in-out infinite alternate'
        }} />

        <div style={{
          background: 'rgba(20, 20, 35, 0.8)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 0 40px rgba(214, 107, 255, 0.4)',
          width: '100%',
          maxWidth: '360px',
          color: '#fff',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 1.5s ease forwards'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '2rem', fontWeight: '700' }}>PAIA</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>
              {isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta nueva'}
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '5px',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid rgba(214, 107, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.3)'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem', fontWeight: '500' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid rgba(214, 107, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(214, 107, 255, 0.3)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #d66bff, #9f5fff)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
                fontWeight: '600',
                boxShadow: loading ? 'none' : '0 0 20px rgba(214, 107, 255, 0.5)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 0 30px rgba(214, 107, 255, 0.8)')}
              onMouseLeave={(e) => !loading && (e.target.style.boxShadow = '0 0 20px rgba(214, 107, 255, 0.5)')}
            >
              {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem' }}>o continuar con</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={handleGoogleSignIn}
              style={{
                width: '48%',
                padding: '10px',
                background: '#252547',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3a3a68';
                e.target.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#252547';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '20px', height: '20px' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.21 3.6l6.85-6.85C35.63 2.6 30.3 0 24 0 14.64 0 6.48 5.58 2.56 13.68l7.98 6.2C12.32 13.64 17.72 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.64-.15-3.22-.43-4.76H24v9.04h12.94c-.56 2.84-2.22 5.26-4.71 6.88l7.2 5.6C43.94 37.24 46.98 31.4 46.98 24.55z"/>
                <path fill="#FBBC05" d="M10.54 28.42c-.8-2.34-1.25-4.84-1.25-7.42s.45-5.08 1.25-7.42L2.56 7.9C.92 11.08 0 14.44 0 18c0 3.56.92 6.92 2.56 10.1l7.98-6.2z"/>
                <path fill="#4285F4" d="M24 48c6.48 0 11.93-2.14 15.9-5.84l-7.2-5.6c-2.01 1.35-4.58 2.16-8.7 2.16-6.28 0-11.68-4.14-13.46-9.86l-7.98 6.2C6.48 42.42 14.64 48 24 48z"/>
              </svg>
              Google
            </button>

            <button
              onClick={() => alert('Login con Microsoft próximamente')}
              style={{
                width: '48%',
                padding: '10px',
                background: '#252547',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3a3a68';
                e.target.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#252547';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" style={{ width: '20px', height: '20px' }}>
                <rect width="10" height="10" x="0" y="0" fill="#f25022"/>
                <rect width="10" height="10" x="13" y="0" fill="#7fba00"/>
                <rect width="10" height="10" x="0" y="13" fill="#00a4ef"/>
                <rect width="10" height="10" x="13" y="13" fill="#ffb900"/>
              </svg>
              Microsoft
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: '#d66bff',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#9f5fff'}
              onMouseLeave={(e) => e.target.style.color = '#d66bff'}
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}