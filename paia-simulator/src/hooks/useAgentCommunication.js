import { useState, useCallback, useEffect } from 'react';
import PAIAApi from '@/utils/api';

/**
 * Hook para gestionar la comunicación entre agentes conectados
 * @param {string} userId - ID del usuario actual
 * @returns {Object} Métodos y estado para comunicación entre agentes
 */
export function useAgentCommunication(userId) {
    const [activeConnections, setActiveConnections] = useState([]);
    const [messageQueue, setMessageQueue] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState({});
    const [loading, setLoading] = useState(false);

    /**
     * Cargar conexiones activas del usuario desde el backend
     */
    const loadActiveConnections = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL;
            if (!apiBase) {
                console.warn('NEXT_PUBLIC_API_URL no está definido');
                return;
            }

            // Obtener conexiones de flujo activas
            const response = await fetch(`${apiBase}/api/flow/connections/active/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setActiveConnections(data.connections || []);

                // Actualizar estado de conexiones
                const statusMap = {};
                (data.connections || []).forEach(conn => {
                    statusMap[conn.id] = {
                        isActive: true,
                        lastActivity: conn.last_activity || new Date().toISOString()
                    };
                });
                setConnectionStatus(statusMap);
            }
        } catch (error) {
            console.error('Error loading active connections:', error);
            setActiveConnections([]);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Enviar mensaje a un agente conectado a través de una conexión de flujo
     * @param {string} connectionId - ID de la conexión
     * @param {string} message - Mensaje a enviar
     * @returns {Promise<Object>} Respuesta del agente
     */
    const sendToConnectedAgent = useCallback(async (connectionId, message) => {
        try {
            const connection = activeConnections.find(c => c.id === connectionId);
            if (!connection) {
                throw new Error('Conexión no encontrada');
            }

            // Usar el método existente de la API
            const response = await PAIAApi.sendMessageBetweenAgents(
                connection.source_agent_id,
                connection.target_agent_id,
                message
            );

            // Actualizar estado de la conexión
            setConnectionStatus(prev => ({
                ...prev,
                [connectionId]: {
                    ...prev[connectionId],
                    lastActivity: new Date().toISOString(),
                    lastMessage: message
                }
            }));

            return response;
        } catch (error) {
            console.error('Error sending message to connected agent:', error);
            throw error;
        }
    }, [activeConnections]);

    /**
     * Obtener historial de mensajes de una conexión
     * @param {string} connectionId - ID de la conexión
     * @returns {Promise<Array>} Historial de mensajes
     */
    const getMessageHistory = useCallback(async (connectionId) => {
        try {
            const connection = activeConnections.find(c => c.id === connectionId);
            if (!connection) return [];

            const history = await PAIAApi.getConversationHistory(
                connection.source_agent_id,
                connection.target_agent_id
            );

            return history;
        } catch (error) {
            console.error('Error getting message history:', error);
            return [];
        }
    }, [activeConnections]);

    /**
     * Obtener información de una conexión específica
     * @param {string} connectionId - ID de la conexión
     * @returns {Object|null} Información de la conexión
     */
    const getConnectionInfo = useCallback((connectionId) => {
        const connection = activeConnections.find(c => c.id === connectionId);
        if (!connection) return null;

        return {
            ...connection,
            status: connectionStatus[connectionId] || { isActive: false }
        };
    }, [activeConnections, connectionStatus]);

    /**
     * Verificar si hay mensajes pendientes en una conexión
     * @param {string} connectionId - ID de la conexión
     * @returns {number} Número de mensajes pendientes
     */
    const getPendingMessagesCount = useCallback((connectionId) => {
        const queuedMessages = messageQueue.filter(msg => msg.connectionId === connectionId);
        return queuedMessages.length;
    }, [messageQueue]);

    // Cargar conexiones al montar y cada 30 segundos
    useEffect(() => {
        if (userId) {
            loadActiveConnections();

            // Recargar cada 30 segundos para mantener actualizado
            const interval = setInterval(loadActiveConnections, 30000);
            return () => clearInterval(interval);
        }
    }, [userId, loadActiveConnections]);

    return {
        // Estado
        activeConnections,
        connectionStatus,
        loading,
        messageQueue,

        // Métodos
        sendToConnectedAgent,
        getMessageHistory,
        loadActiveConnections,
        getConnectionInfo,
        getPendingMessagesCount
    };
}

export default useAgentCommunication;
