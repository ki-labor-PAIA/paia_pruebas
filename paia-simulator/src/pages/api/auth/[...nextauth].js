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
              name: user.name || user.email,
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
            user.id = result.user_id
            return true
          }
        } catch (error) {
          console.error('Google sign-in error:', error)
        }
      }
      return true
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
      }
      return token
    },
    
    async session({ session, token }) {
      session.user.id = token.userId
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