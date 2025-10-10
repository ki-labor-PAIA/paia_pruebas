// src/pages/api/auth/google-calendar/status.js
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'paia',
  password: 'root',
  port: 5432,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requerido' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT access_token, expires_at FROM google_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ isAuthenticated: false });
    }
    
    const token = result.rows[0];
    
    // Verificar si el token está expirado
    if (token.expires_at && new Date() >= new Date(token.expires_at)) {
      return res.json({ isAuthenticated: false, expired: true });
    }
    
    return res.json({ isAuthenticated: true });
    
  } catch (error) {
    console.error('Error verificando estado de autenticación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
}