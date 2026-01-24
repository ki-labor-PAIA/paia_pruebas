"""
PAIA Protocol - Message Classes
Clases para representar los diferentes tipos de mensajes del protocolo PAIA
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid


@dataclass
class PAIAMessageMetadata:
    """Metadata común para todos los mensajes PAIA"""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    protocol_version: str = "1.0"
    conversation_id: Optional[str] = None
    in_reply_to: Optional[str] = None
    ttl: Optional[int] = None  # Time to live en segundos
    requires_human_attention: bool = False  # Si requiere atención humana


@dataclass
class PAIAMessageExpectations:
    """Expectativas para mensajes de tipo request"""
    response_required: bool = True
    timeout_seconds: int = 300
    response_format: str = "structured"  # "structured" o "natural"


@dataclass
class PAIAMessage:
    """
    Clase base para todos los mensajes PAIA.
    Todos los mensajes heredan de esta estructura.
    """
    type: str
    from_agent_id: str
    to_agent_id: str
    payload: Dict[str, Any]
    metadata: PAIAMessageMetadata = field(default_factory=PAIAMessageMetadata)
    expectations: Optional[PAIAMessageExpectations] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convertir el mensaje a diccionario"""
        result = {
            "type": self.type,
            "from_agent_id": self.from_agent_id,
            "to_agent_id": self.to_agent_id,
            "payload": self.payload,
            "metadata": asdict(self.metadata)
        }

        if self.expectations:
            result["expectations"] = asdict(self.expectations)

        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PAIAMessage':
        """Crear un mensaje desde un diccionario"""
        metadata = PAIAMessageMetadata(**data.get("metadata", {}))
        expectations = None
        if "expectations" in data:
            expectations = PAIAMessageExpectations(**data["expectations"])

        return cls(
            type=data["type"],
            from_agent_id=data["from_agent_id"],
            to_agent_id=data["to_agent_id"],
            payload=data["payload"],
            metadata=metadata,
            expectations=expectations
        )


# ==================== DISCOVERY MESSAGES ====================

@dataclass
class PAIADiscoveryMessage(PAIAMessage):
    """Mensajes de descubrimiento de capabilities"""

    @staticmethod
    def create_capability_query(
        from_agent_id: str,
        to_agent_id: str,
        requested_capabilities: List[str] = None,
        query: str = "¿Qué capacidades tienes?"
    ) -> 'PAIADiscoveryMessage':
        """Crear un mensaje de consulta de capabilities"""
        return PAIADiscoveryMessage(
            type="paia.discovery.capability_query",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload={
                "query": query,
                "requested_capabilities": requested_capabilities or []
            },
            metadata=PAIAMessageMetadata()
        )

    @staticmethod
    def create_capability_response(
        from_agent_id: str,
        to_agent_id: str,
        capabilities: List[Dict[str, Any]],
        in_reply_to: str
    ) -> 'PAIADiscoveryMessage':
        """Crear un mensaje de respuesta con capabilities"""
        metadata = PAIAMessageMetadata(in_reply_to=in_reply_to)

        return PAIADiscoveryMessage(
            type="paia.discovery.capability_response",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload={
                "capabilities": capabilities
            },
            metadata=metadata
        )


# ==================== REQUEST MESSAGES ====================

@dataclass
class PAIARequestMessage(PAIAMessage):
    """Mensajes de solicitud de acción"""

    @staticmethod
    def create_calendar_check_availability(
        from_agent_id: str,
        to_agent_id: str,
        date: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
        conversation_id: Optional[str] = None
    ) -> 'PAIARequestMessage':
        """Crear solicitud de verificación de disponibilidad en calendario"""
        metadata = PAIAMessageMetadata(conversation_id=conversation_id)

        payload = {
            "action": "check_availability",
            "parameters": {
                "date": date
            }
        }

        if start_time:
            payload["parameters"]["start_time"] = start_time
        if end_time:
            payload["parameters"]["end_time"] = end_time
        if duration_minutes:
            payload["parameters"]["duration_minutes"] = duration_minutes
        if context:
            payload["context"] = context

        return PAIARequestMessage(
            type="paia.request.calendar.check_availability",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata,
            expectations=PAIAMessageExpectations(
                response_required=True,
                timeout_seconds=300,
                response_format="structured"
            )
        )

    @staticmethod
    def create_calendar_schedule_event(
        from_agent_id: str,
        to_agent_id: str,
        title: str,
        date: str,
        start_time: str,
        end_time: str,
        attendees: List[str],
        location: Optional[str] = None,
        description: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> 'PAIARequestMessage':
        """Crear solicitud de agendar evento en calendario"""
        metadata = PAIAMessageMetadata(conversation_id=conversation_id)

        payload = {
            "action": "schedule_event",
            "parameters": {
                "title": title,
                "date": date,
                "start_time": start_time,
                "end_time": end_time,
                "attendees": attendees
            }
        }

        if location:
            payload["parameters"]["location"] = location
        if description:
            payload["parameters"]["description"] = description

        return PAIARequestMessage(
            type="paia.request.calendar.schedule_event",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata,
            expectations=PAIAMessageExpectations(
                response_required=True,
                timeout_seconds=300,
                response_format="structured"
            )
        )

    @staticmethod
    def create_task_delegate(
        from_agent_id: str,
        to_agent_id: str,
        task_title: str,
        task_description: str,
        due_date: Optional[str] = None,
        priority: str = "medium",
        conversation_id: Optional[str] = None
    ) -> 'PAIARequestMessage':
        """Crear solicitud de delegación de tarea"""
        metadata = PAIAMessageMetadata(conversation_id=conversation_id)

        payload = {
            "action": "delegate_task",
            "parameters": {
                "task_title": task_title,
                "task_description": task_description,
                "priority": priority
            }
        }

        if due_date:
            payload["parameters"]["due_date"] = due_date

        return PAIARequestMessage(
            type="paia.request.task.delegate",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata,
            expectations=PAIAMessageExpectations(
                response_required=True,
                timeout_seconds=300,
                response_format="structured"
            )
        )


# ==================== RESPONSE MESSAGES ====================

@dataclass
class PAIAResponseMessage(PAIAMessage):
    """Mensajes de respuesta"""

    @staticmethod
    def create_success_response(
        from_agent_id: str,
        to_agent_id: str,
        response_type: str,
        result: Dict[str, Any],
        in_reply_to: str,
        conversation_id: Optional[str] = None,
        execution_details: Optional[Dict[str, Any]] = None
    ) -> 'PAIAResponseMessage':
        """Crear respuesta exitosa"""
        metadata = PAIAMessageMetadata(
            conversation_id=conversation_id,
            in_reply_to=in_reply_to
        )

        payload = {
            "status": "success",
            "result": result
        }

        if execution_details:
            payload["execution_details"] = execution_details

        return PAIAResponseMessage(
            type=response_type,
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata
        )

    @staticmethod
    def create_error_response(
        from_agent_id: str,
        to_agent_id: str,
        error_code: str,
        error_message: str,
        in_reply_to: str,
        conversation_id: Optional[str] = None,
        retry_possible: bool = True,
        retry_after_seconds: Optional[int] = None
    ) -> 'PAIAResponseMessage':
        """Crear respuesta de error"""
        metadata = PAIAMessageMetadata(
            conversation_id=conversation_id,
            in_reply_to=in_reply_to
        )

        payload = {
            "status": "error",
            "error_code": error_code,
            "error_message": error_message,
            "original_request_id": in_reply_to,
            "retry_possible": retry_possible
        }

        if retry_after_seconds:
            payload["retry_after_seconds"] = retry_after_seconds

        return PAIAResponseMessage(
            type="paia.response.error",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata
        )


# ==================== CHAT MESSAGES ====================

@dataclass
class PAIAChatMessage(PAIAMessage):
    """Mensajes de conversación natural"""

    @staticmethod
    def create_chat_message(
        from_agent_id: str,
        to_agent_id: str,
        content: str,
        intent: str = "question",
        entities: Optional[Dict[str, Any]] = None,
        conversation_id: Optional[str] = None,
        requires_human_attention: bool = False
    ) -> 'PAIAChatMessage':
        """Crear mensaje de chat"""
        metadata = PAIAMessageMetadata(
            conversation_id=conversation_id,
            requires_human_attention=requires_human_attention
        )

        payload = {
            "content": content,
            "intent": intent
        }

        if entities:
            payload["entities"] = entities

        return PAIAChatMessage(
            type="paia.chat.message",
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=metadata
        )


# ==================== SYSTEM MESSAGES ====================

@dataclass
class PAIASystemMessage(PAIAMessage):
    """Mensajes del sistema"""

    @staticmethod
    def create_error_system_message(
        to_agent_id: str,
        error_code: str,
        error_message: str,
        original_message_id: str,
        retry_after_seconds: Optional[int] = None
    ) -> 'PAIASystemMessage':
        """Crear mensaje de error del sistema"""
        payload = {
            "error_code": error_code,
            "error_message": error_message,
            "original_message_id": original_message_id
        }

        if retry_after_seconds:
            payload["retry_after_seconds"] = retry_after_seconds

        return PAIASystemMessage(
            type="paia.system.error",
            from_agent_id="system",
            to_agent_id=to_agent_id,
            payload=payload,
            metadata=PAIAMessageMetadata()
        )

    @staticmethod
    def create_confirmation_message(
        to_agent_id: str,
        confirmed_message_id: str,
        status: str = "delivered"
    ) -> 'PAIASystemMessage':
        """Crear mensaje de confirmación del sistema"""
        return PAIASystemMessage(
            type="paia.system.confirmation",
            from_agent_id="system",
            to_agent_id=to_agent_id,
            payload={
                "message_id": confirmed_message_id,
                "status": status
            },
            metadata=PAIAMessageMetadata()
        )


# ==================== MESSAGE FACTORY ====================

class PAIAMessageFactory:
    """Factory para crear mensajes PAIA desde diccionarios"""

    MESSAGE_TYPE_MAP = {
        "paia.discovery.capability_query": PAIADiscoveryMessage,
        "paia.discovery.capability_response": PAIADiscoveryMessage,
        "paia.request.calendar.check_availability": PAIARequestMessage,
        "paia.request.calendar.schedule_event": PAIARequestMessage,
        "paia.request.task.delegate": PAIARequestMessage,
        "paia.response.calendar.availability": PAIAResponseMessage,
        "paia.response.calendar.event_created": PAIAResponseMessage,
        "paia.response.error": PAIAResponseMessage,
        "paia.chat.message": PAIAChatMessage,
        "paia.system.error": PAIASystemMessage,
        "paia.system.confirmation": PAIASystemMessage
    }

    @classmethod
    def create_from_dict(cls, data: Dict[str, Any]) -> PAIAMessage:
        """Crear mensaje PAIA desde diccionario"""
        message_type = data.get("type")

        if not message_type:
            raise ValueError("Mensaje debe tener un campo 'type'")

        # Buscar la clase apropiada
        message_class = cls.MESSAGE_TYPE_MAP.get(message_type, PAIAMessage)

        return message_class.from_dict(data)
