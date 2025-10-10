export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos' })
  }

  try {
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (response.ok) {
      res.status(201).json({ message: 'Usuario creado exitosamente', user_id: data.user_id })
    } else {
      res.status(response.status).json({ message: data.message || 'Error al crear usuario' })
    }
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}