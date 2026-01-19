const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class PAIAApi {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
    this.backendOnline = true; // Estado por defecto
    this.healthChecked = false; // Para no hacer múltiples checks
  }

  async checkBackendConnection() {
    if (this.healthChecked) return this.backendOnline;

    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.backendOnline = response.ok;
    } catch (err) {
      console.warn('Backend no disponible. Se desactivan funciones de red.');
      this.backendOnline = false;
    } finally {
      this.healthChecked = true;
    }

    return this.backendOnline;
  }

  async createAgent(agentData) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error creating agent:', error);
      return null;
    }
  }

  async getAgents(userId = null) {
    if (!(await this.checkBackendConnection())) return [];
    try {
      const url = userId ? `${this.baseUrl}/agents?user_id=${userId}` : `${this.baseUrl}/agents`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }

  async getPublicAgents(excludeUserId = null) {
    if (!(await this.checkBackendConnection())) return [];
    try {
      const url = excludeUserId
        ? `${this.baseUrl}/agents/public?exclude_user_id=${excludeUserId}`
        : `${this.baseUrl}/agents/public`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Manejar tanto {agents: [...]} como [...]
      return data.agents || data || [];
    } catch (error) {
      console.error('Error fetching public agents:', error);
      return [];
    }
  }

  async createConnection(connectionData) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error creating connection:', error);
      return null;
    }
  }

  async getConnections() {
    if (!(await this.checkBackendConnection())) return [];
    try {
      const response = await fetch(`${this.baseUrl}/connections`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching connections:', error);
      return [];
    }
  }

  async getUserConnections(userId, status = 'accepted') {
    if (!(await this.checkBackendConnection())) return { connections: [] };
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/connections?status=${status}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user connections:', error);
      return { connections: [] };
    }
  }

  async respondToConnectionRequest(connectionId, response, userId) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const res = await fetch(`${this.baseUrl}/users/connect/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, response: response, user_id: userId }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status} ${errorText}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Error responding to connection request:', error);
      throw error;
    }
  }

  async createSocialConnection(requesterId, recipientId, connectionType) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/users/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: requesterId,
          recipient_id: recipientId,
          connection_type: connectionType,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error enviando solicitud de conexión');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating social connection:', error);
      throw error;
    }
  }

  async createFlowConnection(connectionData) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/flow/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error creando conexión de flujo');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating flow connection:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm, excludeUserId) {
    if (!(await this.checkBackendConnection())) return { users: [] };
    try {
      const url = `${this.baseUrl}/users/search?q=${encodeURIComponent(searchTerm)}&exclude_user_id=${excludeUserId}`;
      console.log('Calling search URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Error buscando usuarios: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Search result:', result);
      return result;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error; // Re-throw para que llegue al componente
    }
  }

  async getPublicFlows(userId) {
    if (!(await this.checkBackendConnection())) return { flows: [] };
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/public-flows`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching public flows:', error);
      return { flows: [] };
    }
  }

  async sendMessage(agentId, message, userId = null) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id: userId }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async sendMessageBetweenAgents(fromAgentId, toAgentId, message) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/agents/${fromAgentId}/send-to/${toAgentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error sending message between agents:', error);
      return null;
    }
  }

  async getConversationHistory(agent1Id, agent2Id) {
    if (!(await this.checkBackendConnection())) return [];
    try {
      const response = await fetch(`${this.baseUrl}/conversations/${agent1Id}/${agent2Id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  async getEmails(userId) {
    const url = userId ? `${this.baseUrl}/emails?user_id=${userId}` : `${this.baseUrl}/emails`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al obtener emails');
    return await response.json();
  }

  async getEventos() {
    const response = await fetch(`${this.baseUrl}/eventos`);
    if (!response.ok) throw new Error('Error al obtener eventos');
    return await response.json();
  }

  async getNotas() {
    const response = await fetch(`${this.baseUrl}/notas`);
    if (!response.ok) throw new Error('Error al obtener notas');
    return await response.json();
  }

  async getHealthCheck() {
    return this.checkBackendConnection(); // puedes seguir usando esta forma también
  }

  createWebSocket(agentId) {
    if (!this.backendOnline) {
      console.warn('No se puede abrir WebSocket: backend offline.');
      return null;
    }
    const wsUrl = `ws://${API_BASE_URL.replace('http://', '')}/ws/${agentId}`;
    return new WebSocket(wsUrl);
  }
}

export default new PAIAApi();
