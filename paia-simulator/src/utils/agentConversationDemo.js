// Archivo de utilidad para simular conversaciones entre agentes para demos
// Ubicacion: src/utils/agentConversationDemo.js

/**
 * Genera una conversacion de demostracion entre dos agentes
 * para el caso de uso: Agendar una reunion
 */
export function generateMeetingConversation(sourceAgentId, targetAgentId) {
    const baseTime = new Date();

    return [
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Hola! Mi usuario me pidio coordinar contigo para agendar una reunion el viernes a las 6 PM. Tu usuario esta disponible a esa hora?",
            timestamp: new Date(baseTime.getTime()).toISOString(),
            type: 'question'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Hola! Dejame revisar el calendario de mi usuario...",
            timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
            type: 'processing'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Veo que el viernes a las 6 PM mi usuario tiene un compromiso. Podriamos mover la reunion a las 7 PM o considerar el jueves a las 6 PM?",
            timestamp: new Date(baseTime.getTime() + 5000).toISOString(),
            type: 'response'
        },
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Perfecto, dejame verificar esas opciones con el calendario de mi usuario...",
            timestamp: new Date(baseTime.getTime() + 7000).toISOString(),
            type: 'processing'
        },
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Excelente! El viernes a las 7 PM funciona perfectamente. Mi usuario esta libre en ese horario. Confirmamos esa hora?",
            timestamp: new Date(baseTime.getTime() + 10000).toISOString(),
            type: 'response'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Confirmado! Voy a agendar la reunion para el viernes a las 7 PM en el calendario de mi usuario. Necesitas que agregue algun detalle especifico?",
            timestamp: new Date(baseTime.getTime() + 12000).toISOString(),
            type: 'confirmation'
        },
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Si, por favor agrega como tema: 'Reunion de coordinacion de proyecto'. Yo hare lo mismo en el calendario de mi usuario.",
            timestamp: new Date(baseTime.getTime() + 14000).toISOString(),
            type: 'request'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Listo! He creado el evento en el calendario con el tema 'Reunion de coordinacion de proyecto' para el viernes a las 7 PM. Nos vemos entonces!",
            timestamp: new Date(baseTime.getTime() + 16000).toISOString(),
            type: 'success'
        },
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Perfecto! Reunion agendada exitosamente. Gracias por la coordinacion.",
            timestamp: new Date(baseTime.getTime() + 18000).toISOString(),
            type: 'success'
        }
    ];
}

/**
 * Genera una conversacion de demostracion para compartir informacion
 */
export function generateInfoSharingConversation(sourceAgentId, targetAgentId) {
    const baseTime = new Date();

    return [
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Hola! Mi usuario me pidio compartir contigo los ultimos reportes de ventas del trimestre. Tu usuario necesita esta informacion?",
            timestamp: new Date(baseTime.getTime()).toISOString(),
            type: 'question'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Si! Mi usuario estaba esperando esos reportes. Puedes enviarlos?",
            timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
            type: 'response'
        },
        {
            from: sourceAgentId,
            to: targetAgentId,
            content: "Claro, te estoy enviando los reportes ahora... [Enviando: Q3_Sales_Report.pdf, Q3_Analytics.xlsx]",
            timestamp: new Date(baseTime.getTime() + 4000).toISOString(),
            type: 'transfer'
        },
        {
            from: targetAgentId,
            to: sourceAgentId,
            content: "Recibido! He guardado los archivos y notificado a mi usuario. Gracias por la informacion.",
            timestamp: new Date(baseTime.getTime() + 7000).toISOString(),
            type: 'success'
        }
    ];
}

/**
 * Simula el envio progresivo de mensajes con delays realistas
 */
export async function simulateConversation(messages, onMessageReceived, delayBetweenMessages = 2000) {
    for (let i = 0; i < messages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
        onMessageReceived(messages[i]);
    }
}

/**
 * Detecta si un mensaje del usuario solicita comunicacion entre agentes
 */
export function detectAgentCommunicationRequest(userMessage) {
    // Normalizar texto removiendo acentos
    const normalize = (text) => {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    const keywords = [
        'comunicate con',
        'habla con',
        'preguntale a',
        'coordina con',
        'agenda con',
        'contacta a',
        'dile a',
        'pregunta a',
        'consulta con'
    ];

    const normalizedMessage = normalize(userMessage);
    const detected = keywords.some(keyword => normalizedMessage.includes(keyword));
    console.log('Detectando:', normalizedMessage, '-> Resultado:', detected);
    return detected;
}

/**
 * Extrae el nombre del destinatario del mensaje
 */
export function extractTargetName(userMessage) {
    // Patrones comunes: "comunicate con [nombre]", "habla con [nombre]"
    const patterns = [
        /comunicate con ([a-zaeioun\s]+)/i,
        /habla con ([a-zaeioun\s]+)/i,
        /preguntale a ([a-zaeioun\s]+)/i,
        /coordina con ([a-zaeioun\s]+)/i,
        /contacta a ([a-zaeioun\s]+)/i,
        /dile a ([a-zaeioun\s]+)/i
    ];

    for (const pattern of patterns) {
        const match = userMessage.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Genera colores unicos para agentes basados en su ID
 */
export function getAgentColorFromId(agentId) {
    const colors = [
        '#6366f1', // Indigo
        '#059669', // Emerald
        '#DC2626', // Red
        '#D97706', // Amber
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#F59E0B'  // Yellow
    ];

    // Usar hash simple del ID para seleccionar color consistente
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
        hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

export default {
    generateMeetingConversation,
    generateInfoSharingConversation,
    simulateConversation,
    detectAgentCommunicationRequest,
    extractTargetName,
    getAgentColorFromId
};
