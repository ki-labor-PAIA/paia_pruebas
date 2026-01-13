"""
Data models for PAIA agents, connections, and messages.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Any
from datetime import datetime


@dataclass
class PAIAAgent:
    """
    Represents a PAIA intelligent agent.

    Attributes:
        id: Unique identifier for the agent
        name: Display name of the agent
        description: Brief description of agent's purpose
        personality: Agent's personality traits
        expertise: Domain of expertise (e.g., "calendar", "notes", "general")
        status: Current status ("active", "inactive", "persistent")
        created: Timestamp of creation
        mcp_endpoint: MCP server endpoint URL
        user_id: ID of the user who owns this agent
        is_public: Whether other users can discover/connect to this agent
        telegram_chat_id: Telegram chat ID for notifications
        whatsapp_phone_number: WhatsApp number for notifications
        llm_instance: LLM instance (not serialized)
        tools: List of available tools for this agent
        conversation_history: Chat history (not serialized)
    """
    id: str
    name: str
    description: str
    personality: str
    expertise: str
    status: str
    created: str
    mcp_endpoint: str
    user_id: Optional[str] = None
    is_public: bool = True
    telegram_chat_id: Optional[str] = None
    whatsapp_phone_number: Optional[str] = None
    llm_instance: Optional[Any] = field(default=None, repr=False)
    tools: List[Any] = field(default_factory=list)
    conversation_history: List[Any] = field(default_factory=list)


@dataclass
class AgentConnection:
    """
    Represents a connection between two agents.

    Attributes:
        id: Unique identifier for the connection
        agent1: ID of the first agent
        agent2: ID of the second agent
        type: Connection type ("direct", "social", "flow")
        status: Connection status ("active", "pending", "inactive")
        created: Timestamp of creation
    """
    id: str
    agent1: str
    agent2: str
    type: str
    status: str
    created: str


@dataclass
class AgentMessage:
    """
    Represents a message exchanged between agents.

    Attributes:
        id: Unique identifier for the message
        from_agent: ID of the sending agent
        to_agent: ID of the receiving agent
        content: Message content
        timestamp: When the message was sent
        conversation_id: Optional conversation thread ID
        telegram_sent: Whether this message was sent via Telegram
    """
    id: str
    from_agent: str
    to_agent: str
    content: str
    timestamp: str
    conversation_id: Optional[str] = None
    telegram_sent: bool = False
