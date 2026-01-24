"""
PAIA Protocol - Personal AI Assistants Protocol
Version 1.0

Sistema de comunicación para agentes de IA distribuidos.
"""

from .message import (
    PAIAMessage,
    PAIADiscoveryMessage,
    PAIARequestMessage,
    PAIAResponseMessage,
    PAIAChatMessage,
    PAIASystemMessage,
    PAIAMessageFactory
)

from .validator import PAIAMessageValidator, PAIAErrorCodes
from .router import PAIAMessageRouter, WebSocketManager
from .discovery import (
    PAIADiscoveryService,
    AgentCapability,
    AgentProfile,
    CapabilityBuilder
)
from .autonomy import (
    AutonomyManager,
    AutonomyLevel,
    AutonomySettings,
    AutonomyRule,
    AutonomyPresets
)
from .websocket_handler import (
    PAIAWebSocketHandler,
    create_paia_websocket_endpoint
)

__version__ = "1.0.0"
__all__ = [
    # Messages
    "PAIAMessage",
    "PAIADiscoveryMessage",
    "PAIARequestMessage",
    "PAIAResponseMessage",
    "PAIAChatMessage",
    "PAIASystemMessage",
    "PAIAMessageFactory",

    # Validation
    "PAIAMessageValidator",
    "PAIAErrorCodes",

    # Routing
    "PAIAMessageRouter",
    "WebSocketManager",

    # Discovery
    "PAIADiscoveryService",
    "AgentCapability",
    "AgentProfile",
    "CapabilityBuilder",

    # Autonomy
    "AutonomyManager",
    "AutonomyLevel",
    "AutonomySettings",
    "AutonomyRule",
    "AutonomyPresets",

    # WebSocket
    "PAIAWebSocketHandler",
    "create_paia_websocket_endpoint"
]
