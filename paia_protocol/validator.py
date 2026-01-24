"""
PAIA Protocol - Message Validator
Validación de schemas JSON para mensajes PAIA
"""

from typing import Dict, Any, Optional, List
from jsonschema import validate, ValidationError, Draft7Validator
import json


class PAIAMessageValidator:
    """Validador de schemas para mensajes PAIA"""

    # Schema base común para todos los mensajes
    BASE_MESSAGE_SCHEMA = {
        "type": "object",
        "required": ["type", "from_agent_id", "to_agent_id", "payload", "metadata"],
        "properties": {
            "type": {"type": "string"},
            "from_agent_id": {"type": "string"},
            "to_agent_id": {"type": "string"},
            "payload": {"type": "object"},
            "metadata": {
                "type": "object",
                "required": ["message_id", "timestamp", "protocol_version"],
                "properties": {
                    "message_id": {"type": "string"},
                    "timestamp": {"type": "string"},
                    "protocol_version": {"type": "string"},
                    "conversation_id": {"type": ["string", "null"]},
                    "in_reply_to": {"type": ["string", "null"]},
                    "ttl": {"type": ["integer", "null"]}
                }
            },
            "expectations": {
                "type": ["object", "null"],
                "properties": {
                    "response_required": {"type": "boolean"},
                    "timeout_seconds": {"type": "integer"},
                    "response_format": {"type": "string", "enum": ["structured", "natural"]}
                }
            }
        }
    }

    # Schemas específicos por tipo de mensaje
    MESSAGE_SCHEMAS = {
        # ==================== DISCOVERY ====================
        "paia.discovery.capability_query": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.discovery.capability_query"},
                "payload": {
                    "type": "object",
                    "required": ["query"],
                    "properties": {
                        "query": {"type": "string"},
                        "requested_capabilities": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                }
            }
        },

        "paia.discovery.capability_response": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.discovery.capability_response"},
                "payload": {
                    "type": "object",
                    "required": ["capabilities"],
                    "properties": {
                        "capabilities": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["name", "description"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "description": {"type": "string"},
                                    "input_schema": {"type": "object"},
                                    "requires_approval": {"type": "boolean"}
                                }
                            }
                        }
                    }
                }
            }
        },

        # ==================== CALENDAR REQUESTS ====================
        "paia.request.calendar.check_availability": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.request.calendar.check_availability"},
                "payload": {
                    "type": "object",
                    "required": ["action", "parameters"],
                    "properties": {
                        "action": {"const": "check_availability"},
                        "parameters": {
                            "type": "object",
                            "required": ["date"],
                            "properties": {
                                "date": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$"},
                                "start_time": {"type": "string"},
                                "end_time": {"type": "string"},
                                "duration_minutes": {"type": "integer", "minimum": 1}
                            }
                        },
                        "context": {"type": "object"}
                    }
                }
            }
        },

        "paia.request.calendar.schedule_event": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.request.calendar.schedule_event"},
                "payload": {
                    "type": "object",
                    "required": ["action", "parameters"],
                    "properties": {
                        "action": {"const": "schedule_event"},
                        "parameters": {
                            "type": "object",
                            "required": ["title", "date", "start_time", "end_time", "attendees"],
                            "properties": {
                                "title": {"type": "string"},
                                "date": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$"},
                                "start_time": {"type": "string"},
                                "end_time": {"type": "string"},
                                "location": {"type": "string"},
                                "description": {"type": "string"},
                                "attendees": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "minItems": 1
                                }
                            }
                        }
                    }
                }
            }
        },

        # ==================== TASK REQUESTS ====================
        "paia.request.task.delegate": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.request.task.delegate"},
                "payload": {
                    "type": "object",
                    "required": ["action", "parameters"],
                    "properties": {
                        "action": {"const": "delegate_task"},
                        "parameters": {
                            "type": "object",
                            "required": ["task_title", "task_description"],
                            "properties": {
                                "task_title": {"type": "string"},
                                "task_description": {"type": "string"},
                                "due_date": {"type": "string"},
                                "priority": {"type": "string", "enum": ["low", "medium", "high"]}
                            }
                        }
                    }
                }
            }
        },

        # ==================== RESPONSES ====================
        "paia.response.calendar.availability": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.response.calendar.availability"},
                "payload": {
                    "type": "object",
                    "required": ["status", "result"],
                    "properties": {
                        "status": {"const": "success"},
                        "result": {
                            "type": "object",
                            "required": ["available"],
                            "properties": {
                                "available": {"type": "boolean"},
                                "free_slots": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["start", "end", "date"],
                                        "properties": {
                                            "start": {"type": "string"},
                                            "end": {"type": "string"},
                                            "date": {"type": "string"}
                                        }
                                    }
                                }
                            }
                        },
                        "execution_details": {"type": "object"}
                    }
                }
            }
        },

        "paia.response.error": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.response.error"},
                "payload": {
                    "type": "object",
                    "required": ["status", "error_code", "error_message"],
                    "properties": {
                        "status": {"const": "error"},
                        "error_code": {"type": "string"},
                        "error_message": {"type": "string"},
                        "original_request_id": {"type": "string"},
                        "retry_possible": {"type": "boolean"},
                        "retry_after_seconds": {"type": "integer"}
                    }
                }
            }
        },

        # ==================== CHAT ====================
        "paia.chat.message": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.chat.message"},
                "payload": {
                    "type": "object",
                    "required": ["content", "intent"],
                    "properties": {
                        "content": {"type": "string"},
                        "intent": {"type": "string"},
                        "entities": {"type": "object"}
                    }
                }
            }
        },

        # ==================== SYSTEM ====================
        "paia.system.error": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.system.error"},
                "from_agent_id": {"const": "system"},
                "payload": {
                    "type": "object",
                    "required": ["error_code", "error_message"],
                    "properties": {
                        "error_code": {"type": "string"},
                        "error_message": {"type": "string"},
                        "original_message_id": {"type": "string"},
                        "retry_after_seconds": {"type": "integer"}
                    }
                }
            }
        },

        "paia.system.confirmation": {
            "type": "object",
            "allOf": [{"$ref": "#/definitions/base_message"}],
            "properties": {
                "type": {"const": "paia.system.confirmation"},
                "from_agent_id": {"const": "system"},
                "payload": {
                    "type": "object",
                    "required": ["message_id", "status"],
                    "properties": {
                        "message_id": {"type": "string"},
                        "status": {"type": "string", "enum": ["sent", "delivered", "pending", "failed"]}
                    }
                }
            }
        }
    }

    @classmethod
    def validate_message(cls, message: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validar un mensaje PAIA completo.

        Args:
            message: Mensaje a validar

        Returns:
            (is_valid, error_message)
        """
        try:
            # 1. Validar schema base
            validate(instance=message, schema=cls.BASE_MESSAGE_SCHEMA)

            # 2. Validar schema específico del tipo
            message_type = message.get("type")
            if message_type in cls.MESSAGE_SCHEMAS:
                # Crear schema con definiciones
                schema_with_defs = {
                    **cls.MESSAGE_SCHEMAS[message_type],
                    "definitions": {
                        "base_message": cls.BASE_MESSAGE_SCHEMA
                    }
                }
                validate(instance=message, schema=schema_with_defs)

            return True, None

        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Error inesperado en validación: {str(e)}"

    @classmethod
    def validate_paia_type(cls, message_type: str) -> bool:
        """Verificar si un tipo de mensaje es válido"""
        return message_type in cls.MESSAGE_SCHEMAS or message_type.startswith("paia.")

    @classmethod
    def get_schema_for_type(cls, message_type: str) -> Optional[Dict[str, Any]]:
        """Obtener el schema específico para un tipo de mensaje"""
        return cls.MESSAGE_SCHEMAS.get(message_type)

    @classmethod
    def validate_payload_for_type(
        cls,
        message_type: str,
        payload: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validar solo el payload de un mensaje.

        Args:
            message_type: Tipo de mensaje PAIA
            payload: Payload a validar

        Returns:
            (is_valid, error_message)
        """
        schema = cls.get_schema_for_type(message_type)
        if not schema:
            return False, f"Tipo de mensaje desconocido: {message_type}"

        try:
            payload_schema = schema.get("properties", {}).get("payload", {})
            validate(instance=payload, schema=payload_schema)
            return True, None
        except ValidationError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Error validando payload: {str(e)}"


# ==================== ERROR CODES ====================

class PAIAErrorCodes:
    """Códigos de error estándar del protocolo PAIA"""

    # Errores de validación
    INVALID_SCHEMA = "INVALID_SCHEMA"
    INVALID_MESSAGE_TYPE = "INVALID_MESSAGE_TYPE"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"

    # Errores de autorización
    UNAUTHORIZED = "UNAUTHORIZED"
    NOT_CONNECTED = "NOT_CONNECTED"
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"

    # Errores de sistema
    AGENT_OFFLINE = "AGENT_OFFLINE"
    TIMEOUT = "TIMEOUT"
    INTERNAL_ERROR = "INTERNAL_ERROR"

    # Errores de ejecución
    EXECUTION_FAILED = "EXECUTION_FAILED"
    CAPABILITY_NOT_SUPPORTED = "CAPABILITY_NOT_SUPPORTED"
    APPROVAL_DENIED = "APPROVAL_DENIED"

    @classmethod
    def get_error_message(cls, error_code: str) -> str:
        """Obtener mensaje descriptivo para un código de error"""
        messages = {
            cls.INVALID_SCHEMA: "El mensaje no cumple con el schema PAIA",
            cls.INVALID_MESSAGE_TYPE: "Tipo de mensaje desconocido",
            cls.MISSING_REQUIRED_FIELD: "Falta un campo requerido",
            cls.UNAUTHORIZED: "No autorizado para enviar este mensaje",
            cls.NOT_CONNECTED: "Los agentes no están conectados",
            cls.AGENT_NOT_FOUND: "Agente no encontrado",
            cls.AGENT_OFFLINE: "El agente destino está offline",
            cls.TIMEOUT: "Tiempo de espera agotado",
            cls.INTERNAL_ERROR: "Error interno del sistema",
            cls.EXECUTION_FAILED: "Error ejecutando la acción",
            cls.CAPABILITY_NOT_SUPPORTED: "Capacidad no soportada",
            cls.APPROVAL_DENIED: "Aprobación denegada por el usuario"
        }
        return messages.get(error_code, "Error desconocido")
