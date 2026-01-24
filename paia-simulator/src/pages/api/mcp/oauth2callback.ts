// src/pages/api/mcp/oauth2callback.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ 
      error: 'Código de autorización o usuario requerido' 
    });
  }

  // Enviar código al cliente para completar la autenticación
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Calendar - Autenticación</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        p {
          margin-bottom: 1.5rem;
          opacity: 0.9;
        }
        .auth-code {
          background: rgba(255, 255, 255, 0.2);
          padding: 1rem;
          border-radius: 10px;
          font-family: 'Courier New', monospace;
          word-break: break-all;
          margin-bottom: 1.5rem;
        }
        button {
          background: #4285f4;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }
        button:hover {
          background: #3367d6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>Google Calendar Conectado</h1>
        <p>Tu cuenta se ha conectado exitosamente con Google Calendar</p>
        <div class="auth-code">
          <strong>Usuario:</strong> ${userId}<br>
          <strong>Código:</strong> ${code}
        </div>
        <button onclick="window.close()">Cerrar Ventana</button>
      </div>
      
      <script>
        // Enviar datos al componente padre
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            data: {
              userId: '${userId}',
              code: '${code}'
            }
          }, '*');
        }
        
        // Auto-cerrar después de 3 segundos
        setTimeout(() => {
          window.close();
        }, 3000);
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}