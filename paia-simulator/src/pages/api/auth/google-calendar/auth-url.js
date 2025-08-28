// src/pages/api/auth/google-calendar/auth-url.js
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-calendar/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requerido' });
  }

  try {
    const auth = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId,
      include_granted_scopes: true
    });
    
    return res.json({ authUrl });
    
  } catch (error) {
    console.error('Error generando URL de autenticación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}