// Test de detección
import { detectAgentCommunicationRequest } from './agentConversationDemo.js';

const testMessages = [
    "Comunícate con mi amigo para agendar una reunión",
    "comunicate con mi amigo",
    "Habla con Juan",
    "Hola, ¿cómo estás?"
];

testMessages.forEach(msg => {
    const result = detectAgentCommunicationRequest(msg);
    console.log(`"${msg}" -> ${result ? '✅ DETECTADO' : '❌ NO DETECTADO'}`);
});
