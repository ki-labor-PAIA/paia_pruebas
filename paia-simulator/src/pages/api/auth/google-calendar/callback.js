// src/pages/api/auth/google-calendar/callback.js
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
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
        .loading {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status {
          margin-top: 1rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">📅</div>
        <h1>Conectando Google Calendar...</h1>
        <div class="loading"></div>
        <div class="status" id="status">Procesando autenticación...</div>
      </div>
      
      <script>
        async function completeAuth() {
          try {
            document.getElementById('status').textContent = 'Guardando credenciales...';
            
            const response = await fetch('/api/auth/google-calendar', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: '${userId}',
                code: '${code}'
              })
            });

            const result = await response.json();
            
            if (response.ok) {
              document.querySelector('.success-icon').textContent = '✅';
              document.querySelector('h1').textContent = '¡Conectado exitosamente!';
              document.querySelector('.loading').style.display = 'none';
              document.getElementById('status').textContent = 'Google Calendar configurado correctamente';
              
              // Notificar al componente padre
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  data: {
                    userId: '${userId}',
                    code: '${code}',
                    success: true
                  }
                }, '*');
              }
              
              // Auto-cerrar después de 2 segundos
              setTimeout(() => {
                window.close();
              }, 2000);
              
            } else {
              throw new Error(result.error || 'Error desconocido');
            }
            
          } catch (error) {
            document.querySelector('.success-icon').textContent = '❌';
            document.querySelector('h1').textContent = 'Error de conexión';
            document.querySelector('.loading').style.display = 'none';
            document.getElementById('status').textContent = error.message;
            
            // Notificar error al componente padre
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                data: {
                  error: error.message
                }
              }, '*');
            }
          }
        }
        
        // Ejecutar cuando cargue la página
        completeAuth();
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}