import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({
      error: 'Código de autorización o estado requerido'
    });
  }

  try {
    // Parsear el state para obtener el user_id
    // El backend envía state = json.dumps({"user_id": user_id})
    let userId;
    try {
      const stateObj = JSON.parse(state as string);
      userId = stateObj.user_id;
    } catch (e) {
      console.error("Error parsing state JSON:", e);
      // Fallback: asumir que state es directamente el user_id (por compatibilidad)
      userId = state;
    }

    // URL del backend (FastAPI)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    // Intercambiar código por token en el backend
    const response = await fetch(`${backendUrl}/api/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        user_id: userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      throw new Error(`Error del backend al conectar Gmail: ${response.statusText}`);
    }

    // Éxito! Redirigir al usuario al home con un flag de éxito
    res.redirect('/?gmail_connected=true');

  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send(`Error conectando Gmail: ${error.message}`);
  }
}