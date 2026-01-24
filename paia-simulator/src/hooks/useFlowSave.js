import { useState, useCallback, useEffect } from 'react';

export default function useFlowSave({
    userId,
    nodes,
    edges,
    scenarioName,
    scenarioDesc,
    addLogMessage,
    addDecisionMessage,
    initialFlowId = null
}) {
    const [currentFlowId, setCurrentFlowId] = useState(initialFlowId);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Función para guardar flujo
    const saveFlow = useCallback(async (flowData) => {
        setIsSaving(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL;
            if (!apiBase) {
                throw new Error('NEXT_PUBLIC_API_URL no está configurado');
            }

            const response = await fetch(`${apiBase}/api/flows/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    name: flowData.name,
                    description: flowData.description,
                    is_public: flowData.is_public,
                    tags: flowData.tags,
                    flow_data: {
                        nodes: nodes,
                        edges: edges,
                        scenario: {
                            name: scenarioName,
                            description: scenarioDesc
                        }
                    },
                    metadata: {
                        node_count: nodes.length,
                        edge_count: edges.length,
                        created_from: 'simulator'
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error guardando el flujo');
            }

            const result = await response.json();
            addLogMessage(`💾 Flow '${flowData.name}' saved successfully`);
            addDecisionMessage('Sistema', `Flow saved with ID: ${result.flow_id}`, true);

            if (!currentFlowId) {
                setCurrentFlowId(result.flow_id);
            }
            setLastSaved(new Date());

            return result;
        } catch (error) {
            addLogMessage(`❌ Error guardando flujo: ${error.message}`);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [userId, nodes, edges, scenarioName, scenarioDesc, addLogMessage, addDecisionMessage, currentFlowId]);

    // Auto-guardado de flujos
    const autoSaveFlow = useCallback(async () => {
        if (!autoSaveEnabled || !userId || userId === 'anonymous') return;
        if (nodes.length === 0) return; // No guardar flujos vacíos

        try {
            const flowData = {
                user_id: userId,
                name: scenarioName || `Flow ${new Date().toLocaleDateString()}`,
                description: scenarioDesc || 'Auto-saved',
                is_public: false,
                tags: ['auto-save'],
                flow_data: {
                    nodes: nodes,
                    edges: edges,
                    scenario: {
                        name: scenarioName,
                        description: scenarioDesc
                    }
                },
                metadata: {
                    node_count: nodes.length,
                    edge_count: edges.length,
                    created_from: 'simulator-auto',
                    last_modified: new Date().toISOString()
                }
            };

            const apiBase = process.env.NEXT_PUBLIC_API_URL;
            if (!apiBase) {
                console.warn('⚠️ NEXT_PUBLIC_API_URL no está definido, saltando auto-guardado');
                return;
            }

            const url = currentFlowId
                ? `${apiBase}/api/flows/${currentFlowId}`
                : `${apiBase}/api/flows/save`;

            console.log('📤 Intentando auto-guardar en:', url);

            const response = await fetch(url, {
                method: currentFlowId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flowData)
            });

            if (response.ok) {
                const result = await response.json();
                if (!currentFlowId) {
                    setCurrentFlowId(result.flow_id);
                }
                setLastSaved(new Date());
                console.log('💾 Flow auto-saved');
            }
        } catch (error) {
            console.error('❌ Error en auto-guardado:', {
                message: error.message,
                url: currentFlowId ? `${apiBase}/api/flows/${currentFlowId}` : `${apiBase}/api/flows/save`,
                apiBase: apiBase,
                type: error.name
            });
        }
    }, [userId, nodes, edges, scenarioName, scenarioDesc, currentFlowId, autoSaveEnabled]);

    // Debounced auto-save (esperar 3 segundos después del último cambio)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            autoSaveFlow();
        }, 3000);

        return () => clearTimeout(timeoutId);
    }, [nodes, edges, scenarioName, scenarioDesc, autoSaveFlow]);

    return {
        saveFlow,
        currentFlowId,
        lastSaved,
        autoSaveEnabled,
        setAutoSaveEnabled,
        isSaving
    };
}
