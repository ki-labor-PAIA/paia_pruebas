export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/telegram/updates`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    if (response.ok) {
      res.status(200).json(data)
    } else {
      res.status(response.status).json({ message: data.message || 'Error al obtener actualizaciones' })
    }
  } catch (error) {
    console.error('Telegram updates error:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}