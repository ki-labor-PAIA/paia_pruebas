// src/pages/api/auth/google-calendar/status.js
import { createServiceSupabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requerido' });
  }

  try {
    const supabase = createServiceSupabase();
    
    const { data, error } = await supabase
      .from('google_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // No rows found
      return res.json({ isAuthenticated: false });
    }
    
    if (error) {
      throw error;
    }
    
    // Verificar si el token está expirado
    if (data.expires_at && new Date() >= new Date(data.expires_at)) {
      return res.json({ isAuthenticated: false, expired: true });
    }
    
    return res.json({ isAuthenticated: true });
    
  } catch (error) {
    console.error('Error verificando estado de autenticación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}