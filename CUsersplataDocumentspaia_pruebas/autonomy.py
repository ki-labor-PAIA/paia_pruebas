"""
PAIA Protocol - Autonomy Management
Sistema de gestión de niveles de autonomía para agentes
"""

from enum import Enum
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass
import re


class AutonomyLevel(str, Enum):
    """Niveles de autonomía para agentes PAIA"""
    FULL_AUTO = "full_auto"          # Ejecuta sin confirmación
    SUPERVISED = "supervised"         # Pide confirmación antes de ejecutar
    MANUAL = "manual"                 # Solo notifica, usuario decide
    DISABLED = "disabled"             # No acepta mensajes de otros agentes


@dataclass
class AutonomyRule:
    """Regla de autonomía para un agente"""
    condition: str                    # Condición en formato string
    autonomy_level: AutonomyLevel
    priority: int = 0                 # Mayor prioridad = se evalúa primero

    def evaluate(self, message: Dict[str, Any], context: Dict[str, Any] = None) -> bool:
        """
        Evaluar si esta regla aplica al mensaje.

        Args:
            message: Mensaje PAIA a evaluar
            context: Contexto adicional (ej: lista de usuarios confiables)

        Returns:
            True si la condición se cumple
        """
        try:
            # Crear contexto de evaluación
            eval_context = {
                "message_type": message.get("type", ""),
                "from_agent": message.get("from_agent_id", ""),
                "payload": message.get("payload", {}),
                **(context or {})
            }

            # Evaluar la condición
            # Ejemplos de condiciones:
            # - "message_type == 'paia.request.calendar.check_availability'"
            # - "message_type.startswith('paia.request.calendar')"
            # - "from_agent in trusted_agents"

            return eval(self.condition, {"__builtins__": {}}, eval_context)

        except Exception as e:
            print(f"[AUTONOMY] Error evaluando regla '{self.condition}': {e}")
            return False


@dataclass
class AutonomySettings:
    """Configuración de autonomía para un agente"""
    default_level: AutonomyLevel = AutonomyLevel.SUPERVISED
    rules: List[AutonomyRule] = None

    def __post_init__(self):
        if self.rules is None:
            self.rules = []
        # Ordenar reglas por prioridad (mayor primero)
        self.rules.sort(key=lambda r: r.priority, reverse=True)

    def get_autonomy_level(
        self,
        message: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> AutonomyLevel:
        """
        Determinar el nivel de autonomía para un mensaje específico.

        Args:
            message: Mensaje PAIA
            context: Contexto adicional

        Returns:
            Nivel de autonomía a aplicar
        """
        # Evaluar reglas en orden de prioridad
        for rule in self.rules:
            if rule.evaluate(message, context):
                return rule.autonomy_level

        # Si ninguna regla aplica, usar nivel por defecto
        return self.default_level

    def add_rule(
        self,
        condition: str,
        autonomy_level: AutonomyLevel,
        priority: int = 0
    ):
        """Agregar una regla de autonomía"""
        rule = AutonomyRule(
            condition=condition,
            autonomy_level=autonomy_level,
            priority=priority
        )
        self.rules.append(rule)
        # Re-ordenar por prioridad
        self.rules.sort(key=lambda r: r.priority, reverse=True)

    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario para serialización"""
        return {
            "default_level": self.default_level.value,
            "rules": [
                {
                    "condition": rule.condition,
                    "autonomy_level": rule.autonomy_level.value,
                    "priority": rule.priority
                }
                for rule in self.rules
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AutonomySettings':
        """Crear desde diccionario"""
        default_level = AutonomyLevel(data.get("default_level", "supervised"))
        rules = [
            AutonomyRule(
                condition=r["condition"],
                autonomy_level=AutonomyLevel(r["autonomy_level"]),
                priority=r.get("priority", 0)
            )
            for r in data.get("rules", [])
        ]
        return cls(default_level=default_level, rules=rules)


class AutonomyManager:
    """
    Gestor central de autonomía para agentes PAIA.
    Maneja las configuraciones de autonomía de todos los agentes.
    """

    def __init__(self):
        self._agent_settings: Dict[str, AutonomySettings] = {}

    def set_agent_settings(self, agent_id: str, settings: AutonomySettings):
        """Configurar autonomía para un agente"""
        self._agent_settings[agent_id] = settings

    def get_agent_settings(self, agent_id: str) -> Optional[AutonomySettings]:
        """Obtener configuración de autonomía de un agente"""
        return self._agent_settings.get(agent_id)

    def get_autonomy_level_for_message(
        self,
        agent_id: str,
        message: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> AutonomyLevel:
        """
        Determinar nivel de autonomía para un mensaje específico.

        Args:
            agent_id: ID del agente receptor
            message: Mensaje PAIA
            context: Contexto adicional

        Returns:
            Nivel de autonomía a aplicar
        """
        settings = self.get_agent_settings(agent_id)

        if not settings:
            # Configuración por defecto si no hay settings
            return AutonomyLevel.SUPERVISED

        return settings.get_autonomy_level(message, context)

    def requires_approval(
        self,
        agent_id: str,
        message: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> bool:
        """
        Determinar si un mensaje requiere aprobación del usuario.

        Args:
            agent_id: ID del agente receptor
            message: Mensaje PAIA
            context: Contexto adicional

        Returns:
            True si requiere aprobación
        """
        level = self.get_autonomy_level_for_message(agent_id, message, context)
        return level in [AutonomyLevel.SUPERVISED, AutonomyLevel.MANUAL]

    def can_execute_automatically(
        self,
        agent_id: str,
        message: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> bool:
        """
        Determinar si un mensaje puede ejecutarse automáticamente.

        Args:
            agent_id: ID del agente receptor
            message: Mensaje PAIA
            context: Contexto adicional

        Returns:
            True si puede ejecutarse sin intervención
        """
        level = self.get_autonomy_level_for_message(agent_id, message, context)
        return level == AutonomyLevel.FULL_AUTO

    def is_disabled(
        self,
        agent_id: str,
        message: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> bool:
        """
        Determinar si el agente tiene deshabilitada la recepción de este mensaje.

        Args:
            agent_id: ID del agente receptor
            message: Mensaje PAIA
            context: Contexto adicional

        Returns:
            True si está deshabilitado
        """
        level = self.get_autonomy_level_for_message(agent_id, message, context)
        return level == AutonomyLevel.DISABLED

    def create_default_settings(
        self,
        agent_expertise: str = None,
        user_preferences: Dict[str, Any] = None
    ) -> AutonomySettings:
        """
        Crear configuración de autonomía por defecto basada en expertise.

        Args:
            agent_expertise: Especialidad del agente (calendar, tasks, finance, etc.)
            user_preferences: Preferencias del usuario

        Returns:
            AutonomySettings configurado
        """
        settings = AutonomySettings(default_level=AutonomyLevel.SUPERVISED)

        # Reglas por defecto según expertise
        if agent_expertise == "calendar":
            # Consultas de disponibilidad: automático
            settings.add_rule(
                condition="message_type == 'paia.request.calendar.check_availability'",
                autonomy_level=AutonomyLevel.FULL_AUTO,
                priority=10
            )
            # Agendar eventos: supervisado
            settings.add_rule(
                condition="message_type == 'paia.request.calendar.schedule_event'",
                autonomy_level=AutonomyLevel.SUPERVISED,
                priority=10
            )

        elif agent_expertise == "tasks":
            # Delegación de tareas: manual
            settings.add_rule(
                condition="message_type == 'paia.request.task.delegate'",
                autonomy_level=AutonomyLevel.MANUAL,
                priority=10
            )

        elif agent_expertise == "finance":
            # Consultas financieras: automático
            settings.add_rule(
                condition="message_type.startswith('paia.request.finance.query')",
                autonomy_level=AutonomyLevel.FULL_AUTO,
                priority=10
            )
            # Transacciones: supervisado
            settings.add_rule(
                condition="message_type.startswith('paia.request.finance.transfer')",
                autonomy_level=AutonomyLevel.SUPERVISED,
                priority=10
            )

        # Mensajes de chat: siempre automático
        settings.add_rule(
            condition="message_type == 'paia.chat.message'",
            autonomy_level=AutonomyLevel.FULL_AUTO,
            priority=5
        )

        # Discovery: siempre automático
        settings.add_rule(
            condition="message_type.startswith('paia.discovery')",
            autonomy_level=AutonomyLevel.FULL_AUTO,
            priority=5
        )

        return settings

    def load_settings_from_db(self, agent_id: str, db_data: Dict[str, Any]):
        """
        Cargar configuración desde base de datos.

        Args:
            agent_id: ID del agente
            db_data: Datos de configuración desde BD
        """
        try:
            settings = AutonomySettings.from_dict(db_data)
            self.set_agent_settings(agent_id, settings)
        except Exception as e:
            print(f"[AUTONOMY] Error cargando settings para {agent_id}: {e}")
            # Usar settings por defecto
            self.set_agent_settings(
                agent_id,
                AutonomySettings(default_level=AutonomyLevel.SUPERVISED)
            )

    def save_settings_to_db(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtener configuración para guardar en BD.

        Args:
            agent_id: ID del agente

        Returns:
            Diccionario para serializar
        """
        settings = self.get_agent_settings(agent_id)
        if settings:
            return settings.to_dict()
        return None


# ==================== PRESETS DE AUTONOMÍA ====================

class AutonomyPresets:
    """Presets comunes de configuración de autonomía"""

    @staticmethod
    def fully_autonomous() -> AutonomySettings:
        """Agente completamente autónomo"""
        return AutonomySettings(default_level=AutonomyLevel.FULL_AUTO)

    @staticmethod
    def fully_supervised() -> AutonomySettings:
        """Todo requiere aprobación"""
        return AutonomySettings(default_level=AutonomyLevel.SUPERVISED)

    @staticmethod
    def read_only() -> AutonomySettings:
        """Solo puede leer/consultar, no modificar"""
        settings = AutonomySettings(default_level=AutonomyLevel.MANUAL)

        # Permitir consultas automáticas
        settings.add_rule(
            condition="message_type.startswith('paia.request.') and 'check' in message_type or 'query' in message_type",
            autonomy_level=AutonomyLevel.FULL_AUTO,
            priority=10
        )

        return settings

    @staticmethod
    def trusted_users_only(trusted_user_ids: List[str]) -> AutonomySettings:
        """Solo ejecuta automáticamente para usuarios confiables"""
        settings = AutonomySettings(default_level=AutonomyLevel.SUPERVISED)

        # Crear condición para usuarios confiables
        trusted_ids_str = str(trusted_user_ids)
        settings.add_rule(
            condition=f"from_agent.split(':')[0] in {trusted_ids_str}",
            autonomy_level=AutonomyLevel.FULL_AUTO,
            priority=20
        )

        return settings
