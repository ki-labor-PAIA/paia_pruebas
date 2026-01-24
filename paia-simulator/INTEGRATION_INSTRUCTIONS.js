// INSTRUCCIONES DE INTEGRACIÓN DEL MODAL DE CONVERSACIÓN ENTRE AGENTES
// Copia y pega estos fragmentos en PAIASimulator.js

// ============================================
// 1. AGREGAR IMPORTS (después de la línea 27)
// ============================================

import AgentConversationModal from './AgentConversationModal';
import {
    generateMeetingConversation,
    detectAgentCommunicationRequest,
    simulateConversation,
    getAgentColorFromId
} from '@/utils/agentConversationDemo';


// ============================================
// 2. AGREGAR ESTADOS (después de la línea 118, donde están los otros estados)
// ============================================

// Estados para conversación entre agentes
const [showAgentConversation, setShowAgentConversation] = useState(false);
const [agentConversationMessages, setAgentConversationMessages] = useState([]);
const [conversationSourceAgent, setConversationSourceAgent] = useState(null);
const [conversationTargetAgent, setConversationTargetAgent] = useState(null);
const [isConversationActive, setIsConversationActive] = useState(false);


// ============================================
// 3. AGREGAR FUNCIÓN PARA INICIAR CONVERSACIÓN (después de handleSendMessage)
// ============================================

const startAgentConversation = useCallback(async (sourceAgentNode, targetAgentNode, userRequest) => {
    // Cerrar el chat actual
    setShowChat(false);

    // Configurar agentes
    const sourceAgent = {
        id: sourceAgentNode.id,
        name: sourceAgentNode.data.label,
        color: getAgentColorFromId(sourceAgentNode.id)
    };

    const targetAgent = {
        id: targetAgentNode.id,
        name: targetAgentNode.data.label,
        color: getAgentColorFromId(targetAgentNode.id)
    };

    setConversationSourceAgent(sourceAgent);
    setConversationTargetAgent(targetAgent);
    setAgentConversationMessages([]);
    setShowAgentConversation(true);
    setIsConversationActive(true);

    // Generar conversación de demostración
    const demoMessages = generateMeetingConversation(sourceAgent.id, targetAgent.id);

    // Simular envío progresivo de mensajes
    await simulateConversation(
        demoMessages,
        (message) => {
            setAgentConversationMessages(prev => [...prev, message]);
        },
        2500 // 2.5 segundos entre mensajes
    );

    setIsConversationActive(false);

    // Log del evento
    addLogMessage(`🤝 Conversación completada entre ${sourceAgent.name} y ${targetAgent.name}`);
    addDecisionMessage('Sistema', `Los agentes han coordinado exitosamente`, true);
}, [addLogMessage, addDecisionMessage, setShowChat]);


// ============================================
// 4. MODIFICAR handleSendMessage PARA DETECTAR SOLICITUDES DE COMUNICACIÓN
// Busca la función handleSendMessage existente y agrega esto al inicio:
// ============================================

// Al inicio de handleSendMessage, después de las validaciones básicas:
const handleSendMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    // NUEVO: Detectar si el usuario pide comunicación entre agentes
    if (detectAgentCommunicationRequest(message)) {
        // Buscar nodos de agente y conexión
        const agentNodes = nodes.filter(n => n.type === 'actor');
        const connectionNodes = nodes.filter(n => n.type === 'connection' && n.data.isConnected);

        if (agentNodes.length > 0 && connectionNodes.length > 0) {
            // Encontrar el agente conectado
            const sourceAgent = agentNodes.find(a => a.id === activeChatAgent);
            const connectedNode = connectionNodes[0]; // Usar el primer nodo de conexión

            if (sourceAgent && connectedNode.data.targetAgentId) {
                const targetAgent = agentNodes.find(a => a.id === connectedNode.data.targetAgentId);

                if (targetAgent) {
                    // Iniciar conversación entre agentes
                    startAgentConversation(sourceAgent, targetAgent, message);
                    return; // Salir de la función sin procesar el mensaje normalmente
                }
            }
        }
    }

    // ... resto del código existente de handleSendMessage
}, [nodes, activeChatAgent, startAgentConversation, /* otros deps */]);


// ============================================
// 5. AGREGAR EL MODAL AL RENDER (antes del cierre del div principal)
// Busca el final del return statement y agrega antes del último </div>:
// ============================================

{/* Modal de Conversación entre Agentes */ }
<AgentConversationModal
    isOpen={showAgentConversation}
    onClose={() => {
        setShowAgentConversation(false);
        setIsConversationActive(false);
    }}
    sourceAgent={conversationSourceAgent}
    targetAgent={conversationTargetAgent}
    messages={agentConversationMessages}
    isActive={isConversationActive}
/>


// ============================================
// 6. ACTUALIZAR ConnectionNode PARA GUARDAR targetAgentId
// Cuando se crea una conexión, asegúrate de guardar el targetAgentId en data
// ============================================

// En la función que maneja onConnect del modal ConnectUserModal:
const handleConnectionComplete = (connectionData) => {
    if (connectionData.mode === 'flow' && connectionData.agent) {
        // Actualizar el nodo de conexión con la información del agente objetivo
        setNodes(prevNodes => prevNodes.map(node => {
            if (node.id === activeConnectionNodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        isConnected: true,
                        targetAgentId: connectionData.agent.id,
                        targetAgentName: connectionData.agent.name,
                        connectionType: 'agent'
                    }
                };
            }
            return node;
        }));
    }
};


// ============================================
// RESUMEN DE CAMBIOS
// ============================================

/*
1. ✅ Importar AgentConversationModal y utilidades
2. ✅ Agregar estados para el modal
3. ✅ Crear función startAgentConversation
4. ✅ Modificar handleSendMessage para detectar solicitudes
5. ✅ Agregar el modal al render
6. ✅ Actualizar ConnectionNode con targetAgentId

FLUJO DE USO:
1. Usuario crea dos agentes
2. Usuario conecta un agente con un nodo de conexión
3. Usuario conecta el nodo con el agente de un amigo
4. Usuario abre chat con su agente
5. Usuario escribe: "Comunícate con mi amigo para agendar una reunión el viernes a las 6"
6. El chat se cierra y se abre el modal de conversación
7. Los agentes "hablan" entre sí con animaciones
8. El usuario ve la conversación en tiempo real
*/
