const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      return await response.json();
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

  async sendMessage(agentId, message) {
    if (!(await this.checkBackendConnection())) return null;
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
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

  async getEmails() {
    const response = await fetch(`${this.baseUrl}/emails`);
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
