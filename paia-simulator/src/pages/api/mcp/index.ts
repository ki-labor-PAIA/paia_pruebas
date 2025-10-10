// src/pages/api/mcp/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Pool } from 'pg';

// Configuración OAuth de Google
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/mcp/oauth2callback';

// Scopes de Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// Configuración de PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'paia',
  password: 'root',
  port: 5432,
});

// Crear cliente OAuth
function createOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Obtener tokens de usuario desde PostgreSQL
async function getUserTokens(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT access_token, refresh_token, expires_at FROM google_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Usuario no autenticado con Google Calendar');
    }
    
    const token = result.rows[0];
    
    // Verificar si el token está expirado
    if (token.expires_at && new Date() >= new Date(token.expires_at)) {
      throw new Error('Token de Google Calendar expirado');
    }
    
    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expiry_date: token.expires_at ? new Date(token.expires_at).getTime() : undefined
    };
  } finally {
    client.release();
  }
}

// Guardar tokens en PostgreSQL
async function saveUserTokens(userId: string, tokens: any) {
  const client = await pool.connect();
  try {
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    
    await client.query(
      `INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, tokens.access_token, tokens.refresh_token, expiresAt]
    );
  } finally {
    client.release();
  }
}

// Obtener servicio de Google Calendar
async function getCalendarService(userId: string) {
  const tokens = await getUserTokens(userId);
  
  const auth = createOAuth2Client();
  auth.setCredentials(tokens);
  
  return google.calendar({ version: 'v3', auth });
}

// Crear servidor MCP
const server = new McpServer({
  name: "google-calendar-mcp",
  version: "1.0.0"
});

// Tool: Verificar estado de autenticación
server.registerTool(
  "check-auth-status",
  {
    title: "Check Authentication Status",
    description: "Verificar el estado de autenticación del usuario con Google Calendar",
    inputSchema: {
      userId: z.string().describe("ID del usuario")
    }
  },
  async ({ userId }) => {
    try {
      await getUserTokens(userId);
      return {
        content: [{
          type: "text",
          text: `Usuario ${userId} está autenticado con Google Calendar`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Usuario ${userId} necesita autenticarse con Google Calendar`
        }]
      };
    }
  }
);

// Tool: Obtener URL de autenticación
server.registerTool(
  "get-auth-url",
  {
    title: "Get Google Auth URL",
    description: "Obtener URL de autenticación OAuth de Google",
    inputSchema: {
      userId: z.string().describe("ID del usuario")
    }
  },
  async ({ userId }) => {
    const auth = createOAuth2Client();
    
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId,
      include_granted_scopes: true
    });
    
    return {
      content: [{
        type: "text",
        text: `URL de autenticación: ${authUrl}`
      }]
    };
  }
);

// Tool: Completar autenticación OAuth
server.registerTool(
  "complete-auth",
  {
    title: "Complete Google OAuth",
    description: "Completar el proceso de autenticación OAuth con Google",
    inputSchema: {
      userId: z.string().describe("ID del usuario"),
      code: z.string().describe("Código de autorización de Google")
    }
  },
  async ({ userId, code }) => {
    try {
      const auth = createOAuth2Client();
      const { tokens } = await auth.getToken(code);
      
      await saveUserTokens(userId, tokens);
      
      return {
        content: [{
          type: "text",
          text: `Autenticación completada exitosamente para usuario ${userId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error completando autenticación: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Listar calendarios
server.registerTool(
  "list-calendars",
  {
    title: "List Calendars",
    description: "Listar todos los calendarios del usuario",
    inputSchema: {
      userId: z.string().describe("ID del usuario")
    }
  },
  async ({ userId }) => {
    try {
      const calendar = await getCalendarService(userId);
      const response = await calendar.calendarList.list();
      
      const calendars = response.data.items || [];
      const calendarList = calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description || '',
        primary: cal.primary || false,
        accessRole: cal.accessRole || ''
      }));
      
      return {
        content: [{
          type: "text",
          text: `Calendarios encontrados:\n${JSON.stringify(calendarList, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error listando calendarios: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Listar eventos
server.registerTool(
  "list-events",
  {
    title: "List Calendar Events",
    description: "Listar eventos de un calendario en un rango de fechas",
    inputSchema: {
      userId: z.string().describe("ID del usuario"),
      calendarId: z.string().default('primary').describe("ID del calendario"),
      timeMin: z.string().optional().describe("Fecha mínima (ISO format)"),
      timeMax: z.string().optional().describe("Fecha máxima (ISO format)"),
      maxResults: z.number().default(10).describe("Número máximo de eventos")
    }
  },
  async ({ userId, calendarId, timeMin, timeMax, maxResults }) => {
    try {
      const calendar = await getCalendarService(userId);
      
      const params: any = {
        calendarId,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      };
      
      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;
      
      const response = await calendar.events.list(params);
      const events = response.data.items || [];
      
      const eventList = events.map(event => ({
        id: event.id,
        title: event.summary || 'Sin título',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        attendees: event.attendees?.map(a => a.email) || [],
        htmlLink: event.htmlLink
      }));
      
      return {
        content: [{
          type: "text",
          text: `Eventos encontrados (${eventList.length}):\n${JSON.stringify(eventList, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error listando eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Listar eventos de hoy
server.registerTool(
  "list-today-events",
  {
    title: "List Today's Events",
    description: "Listar eventos de hoy del usuario",
    inputSchema: {
      userId: z.string().describe("ID del usuario"),
      calendarId: z.string().default('primary').describe("ID del calendario")
    }
  },
  async ({ userId, calendarId }) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const calendar = await getCalendarService(userId);
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const events = response.data.items || [];
      const eventList = events.map(event => ({
        id: event.id,
        title: event.summary || 'Sin título',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        description: event.description || ''
      }));
      
      return {
        content: [{
          type: "text",
          text: `Eventos de hoy (${eventList.length}):\n${JSON.stringify(eventList, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error listando eventos de hoy: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Crear evento
server.registerTool(
  "create-event",
  {
    title: "Create Calendar Event",
    description: "Crear un nuevo evento en el calendario",
    inputSchema: {
      userId: z.string().describe("ID del usuario"),
      title: z.string().describe("Título del evento"),
      startDateTime: z.string().describe("Fecha y hora de inicio (ISO format)"),
      endDateTime: z.string().describe("Fecha y hora de fin (ISO format)"),
      description: z.string().optional().describe("Descripción del evento"),
      location: z.string().optional().describe("Ubicación del evento"),
      calendarId: z.string().default('primary').describe("ID del calendario"),
      attendees: z.array(z.string()).optional().describe("Lista de emails de asistentes")
    }
  },
  async ({ userId, title, startDateTime, endDateTime, description, location, calendarId, attendees }) => {
    try {
      const calendar = await getCalendarService(userId);
      
      const event: any = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Mexico_City'
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Mexico_City'
        }
      };
      
      if (location) {
        event.location = location;
      }
      
      if (attendees && attendees.length > 0) {
        event.attendees = attendees.map((email: string) => ({ email }));
      }
      
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event
      });
      
      const createdEvent = response.data;
      
      return {
        content: [{
          type: "text",
          text: `Evento creado exitosamente:\n` +
                `ID: ${createdEvent.id}\n` +
                `Título: ${createdEvent.summary}\n` +
                `Inicio: ${createdEvent.start?.dateTime}\n` +
                `Fin: ${createdEvent.end?.dateTime}\n` +
                `Link: ${createdEvent.htmlLink}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error creando evento: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// Función para crear una nueva instancia del servidor (modo stateless)
function getServer(): McpServer {
  const server = new McpServer({
    name: "google-calendar-mcp",
    version: "1.0.0"
  });

  // Registrar todas las herramientas con PostgreSQL
  server.registerTool(
    "check-auth-status",
    {
      title: "Check Authentication Status",
      description: "Verificar el estado de autenticación del usuario con Google Calendar",
      inputSchema: {
        userId: z.string().describe("ID del usuario")
      }
    },
    async ({ userId }) => {
      try {
        await getUserTokens(userId);
        return {
          content: [{
            type: "text",
            text: `Usuario ${userId} está autenticado con Google Calendar`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Usuario ${userId} necesita autenticarse con Google Calendar`
          }]
        };
      }
    }
  );

  server.registerTool(
    "get-auth-url",
    {
      title: "Get Google Auth URL",
      description: "Obtener URL de autenticación OAuth de Google",
      inputSchema: {
        userId: z.string().describe("ID del usuario")
      }
    },
    async ({ userId }) => {
      const auth = createOAuth2Client();
      
      const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: userId,
        include_granted_scopes: true
      });
      
      return {
        content: [{
          type: "text",
          text: `URL de autenticación: ${authUrl}`
        }]
      };
    }
  );

  server.registerTool(
    "complete-auth",
    {
      title: "Complete Google OAuth",
      description: "Completar el proceso de autenticación OAuth con Google",
      inputSchema: {
        userId: z.string().describe("ID del usuario"),
        code: z.string().describe("Código de autorización de Google")
      }
    },
    async ({ userId, code }) => {
      try {
        const auth = createOAuth2Client();
        const { tokens } = await auth.getToken(code);
        
        await saveUserTokens(userId, tokens);
        
        return {
          content: [{
            type: "text",
            text: `Autenticación completada exitosamente para usuario ${userId}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error completando autenticación: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "list-calendars",
    {
      title: "List Calendars",
      description: "Listar todos los calendarios del usuario",
      inputSchema: {
        userId: z.string().describe("ID del usuario")
      }
    },
    async ({ userId }) => {
      try {
        const calendar = await getCalendarService(userId);
        const response = await calendar.calendarList.list();
        
        const calendars = response.data.items || [];
        const calendarList = calendars.map(cal => ({
          id: cal.id,
          name: cal.summary,
          description: cal.description || '',
          primary: cal.primary || false,
          accessRole: cal.accessRole || ''
        }));
        
        return {
          content: [{
            type: "text",
            text: `Calendarios encontrados:\n${JSON.stringify(calendarList, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listando calendarios: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "list-events",
    {
      title: "List Calendar Events",
      description: "Listar eventos de un calendario en un rango de fechas",
      inputSchema: {
        userId: z.string().describe("ID del usuario"),
        calendarId: z.string().default('primary').describe("ID del calendario"),
        timeMin: z.string().optional().describe("Fecha mínima (ISO format)"),
        timeMax: z.string().optional().describe("Fecha máxima (ISO format)"),
        maxResults: z.number().default(10).describe("Número máximo de eventos")
      }
    },
    async ({ userId, calendarId, timeMin, timeMax, maxResults }) => {
      try {
        const calendar = await getCalendarService(userId);
        
        const params: any = {
          calendarId,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        };
        
        if (timeMin) params.timeMin = timeMin;
        if (timeMax) params.timeMax = timeMax;
        
        const response = await calendar.events.list(params);
        const events = response.data.items || [];
        
        const eventList = events.map(event => ({
          id: event.id,
          title: event.summary || 'Sin título',
          description: event.description || '',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location || '',
          attendees: event.attendees?.map(a => a.email) || [],
          htmlLink: event.htmlLink
        }));
        
        return {
          content: [{
            type: "text",
            text: `Eventos encontrados (${eventList.length}):\n${JSON.stringify(eventList, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listando eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "list-today-events",
    {
      title: "List Today's Events",
      description: "Listar eventos de hoy del usuario",
      inputSchema: {
        userId: z.string().describe("ID del usuario"),
        calendarId: z.string().default('primary').describe("ID del calendario")
      }
    },
    async ({ userId, calendarId }) => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        const calendar = await getCalendarService(userId);
        
        const response = await calendar.events.list({
          calendarId,
          timeMin: startOfDay,
          timeMax: endOfDay,
          singleEvents: true,
          orderBy: 'startTime'
        });
        
        const events = response.data.items || [];
        const eventList = events.map(event => ({
          id: event.id,
          title: event.summary || 'Sin título',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location || '',
          description: event.description || ''
        }));
        
        return {
          content: [{
            type: "text",
            text: `Eventos de hoy (${eventList.length}):\n${JSON.stringify(eventList, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listando eventos de hoy: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "create-event",
    {
      title: "Create Calendar Event",
      description: "Crear un nuevo evento en el calendario",
      inputSchema: {
        userId: z.string().describe("ID del usuario"),
        title: z.string().describe("Título del evento"),
        startDateTime: z.string().describe("Fecha y hora de inicio (ISO format)"),
        endDateTime: z.string().describe("Fecha y hora de fin (ISO format)"),
        description: z.string().optional().describe("Descripción del evento"),
        location: z.string().optional().describe("Ubicación del evento"),
        calendarId: z.string().default('primary').describe("ID del calendario"),
        attendees: z.array(z.string()).optional().describe("Lista de emails de asistentes")
      }
    },
    async ({ userId, title, startDateTime, endDateTime, description, location, calendarId, attendees }) => {
      try {
        const calendar = await getCalendarService(userId);
        
        const event: any = {
          summary: title,
          description: description || '',
          start: {
            dateTime: startDateTime,
            timeZone: 'America/Mexico_City'
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/Mexico_City'
          }
        };
        
        if (location) {
          event.location = location;
        }
        
        if (attendees && attendees.length > 0) {
          event.attendees = attendees.map((email: string) => ({ email }));
        }
        
        const response = await calendar.events.insert({
          calendarId,
          requestBody: event
        });
        
        const createdEvent = response.data;
        
        return {
          content: [{
            type: "text",
            text: `Evento creado exitosamente:\n` +
                  `ID: ${createdEvent.id}\n` +
                  `Título: ${createdEvent.summary}\n` +
                  `Inicio: ${createdEvent.start?.dateTime}\n` +
                  `Fin: ${createdEvent.end?.dateTime}\n` +
                  `Link: ${createdEvent.htmlLink}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creando evento: ${error instanceof Error ? error.message : 'Error desconocido'}`
          }],
          isError: true
        };
      }
    }
  );

  return server;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Modo stateless: crear nueva instancia para cada request (según documentación oficial)
  try {
    const server = getServer();
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });
    
    // Limpiar cuando la request se cierre
    res.on('close', () => {
      console.log('Request cerrada');
      transport.close();
      server.close();
    });
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    
  } catch (error) {
    console.error('Error manejando request MCP:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Error interno del servidor',
        },
        id: null,
      });
    }
  }
}