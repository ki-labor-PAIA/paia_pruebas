import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

export default NextAuth({
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
    // Login local
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Llamar al backend para verificar credenciales
          const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })
          
          const user = await response.json()
          
          if (response.ok && user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name || null,
            }
          }
          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          // Registrar/actualizar usuario con Google OAuth
          const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/google-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              google_id: account.providerAccountId
            })
          })
          
          const result = await response.json()
          if (response.ok) {
            // Asignar el ID correcto de la base de datos
            user.dbId = result.user_id
            return true
          }
        } catch (error) {
          console.error('Google sign-in error:', error)
        }
      }
      return true
    },
    
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        // Para usuarios de Google, usar el dbId del callback signIn
        // Para otros usuarios, usar el id original
        token.userId = user.dbId || user.id
        token.name = user.name
        token.email = user.email
      }

      // Handle session updates (when update() is called from client)
      if (trigger === 'update' && session) {
        if (session.name !== undefined) {
          token.name = session.name
        }
      }

      return token
    },

    async session({ session, token }) {
      // Usar el userId del token que contiene el ID correcto de la DB
      session.user.id = token.userId || token.sub
      session.user.name = token.name
      session.user.email = token.email
      return session
    }
  },
  
  pages: {
    signIn: '/auth/signin',
  },
  
  session: {
    strategy: 'jwt',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
})