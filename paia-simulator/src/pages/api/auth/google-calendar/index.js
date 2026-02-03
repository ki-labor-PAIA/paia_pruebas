// src/pages/api/auth/google-calendar/index.js
import { OAuth2Client } from 'google-auth-library';
import { createServiceSupabase } from '@/lib/supabase';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret';
// Calendar usa su propio callback, diferente del de Gmail
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'https://paia.haielab.org/api/auth/google-calendar/callback';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId, code } = req.body;

  console.log('[Calendar Auth] userId recibido:', userId, 'code length:', code?.length);

  if (!userId || !code) {
    return res.status(400).json({ error: 'userId y code requeridos' });
  }

  try {
    const supabase = createServiceSupabase();

    const auth = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await auth.getToken(code);
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'No se pudo obtener el token de acceso' });
    }
    
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    console.log('[Calendar Auth] Guardando token para userId:', userId);

    const { error } = await supabase
      .from('google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      throw error;
    }

    console.log('[Calendar Auth] Token guardado exitosamente para userId:', userId);

    return res.json({
      success: true,
      message: 'Autenticación completada exitosamente'
    });
    
  } catch (error) {
    console.error('Error completando autenticación:', error);
    return res.status(500).json({ 
      error: 'Error completando autenticación: ' + error.message 
    });
  }
}