export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { chat_id, message } = req.body

  if (!chat_id || !message) {
    return res.status(400).json({ message: 'Chat ID y mensaje son requeridos' })
  }

  try {
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/telegram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, message })
    })

    const data = await response.json()

    if (response.ok) {
      res.status(200).json(data)
    } else {
      res.status(response.status).json({ message: data.message || 'Error al enviar mensaje' })
    }
  } catch (error) {
    console.error('Telegram send error:', error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}