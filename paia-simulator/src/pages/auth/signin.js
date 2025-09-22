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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          margin: '1rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ color: '#333', marginBottom: '0.5rem' }}>PAIA</h1>
            <p style={{ color: '#666' }}>
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
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
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
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
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
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem'
              }}
            >
              {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <span style={{ color: '#666' }}>o</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            Continuar con Google
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}