from typing import List, Optional, Dict, Any
from long_term_store_supabase import LongTermStoreSupabase
from memory_manager import MemoryManager, Message


class MemoryService:
    """
    Servicio wrapper para gestión de memoria a largo plazo.

    Proporciona una interfaz simplificada para almacenar y recuperar
    conversaciones y contexto de agentes usando Supabase como backend.
    """

    def __init__(self, long_term_store: LongTermStoreSupabase):
        """
        Inicializar el servicio de memoria.

        Args:
            long_term_store: Instancia del almacén de largo plazo
        """
        self.long_term_store = long_term_store
        self.memory_manager = MemoryManager(long_term_backend=long_term_store)

    def bind_profile(self, agent_id: str, profile_id: str) -> None:
        """
        Vincular un agente a un perfil de memoria estable.

        Args:
            agent_id: ID del agente
            profile_id: ID del perfil de memoria
        """
        self.memory_manager.bind_profile(agent_id, profile_id)

    def add_message(
        self,
        agent_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Agregar un mensaje al historial de un agente.

        Args:
            agent_id: ID del agente
            role: Rol del mensaje (user, assistant, system)
            content: Contenido del mensaje
            metadata: Metadatos adicionales opcionales
        """
        message = Message(role=role, content=content, metadata=metadata or {})
        self.memory_manager.add_message(agent_id, message)

    def get_conversation_history(
        self,
        agent_id: str,
        limit: Optional[int] = None
    ) -> List[Message]:
        """
        Obtener el historial de conversación de un agente.

        Args:
            agent_id: ID del agente
            limit: Número máximo de mensajes a recuperar

        Returns:
            Lista de mensajes del historial
        """
        return self.memory_manager.get_conversation_history(agent_id, limit=limit)

    def clear_conversation_history(self, agent_id: str) -> None:
        """
        Limpiar el historial de conversación de un agente.

        Args:
            agent_id: ID del agente
        """
        self.memory_manager.clear_conversation_history(agent_id)

    def save_context(
        self,
        agent_id: str,
        context_key: str,
        context_value: Any
    ) -> None:
        """
        Guardar contexto adicional para un agente.

        Args:
            agent_id: ID del agente
            context_key: Clave del contexto
            context_value: Valor del contexto
        """
        self.memory_manager.save_context(agent_id, context_key, context_value)

    def get_context(
        self,
        agent_id: str,
        context_key: str
    ) -> Optional[Any]:
        """
        Recuperar contexto guardado de un agente.

        Args:
            agent_id: ID del agente
            context_key: Clave del contexto

        Returns:
            Valor del contexto o None si no existe
        """
        return self.memory_manager.get_context(agent_id, context_key)

    def get_summary(self, agent_id: str) -> str:
        """
        Obtener un resumen de la conversación de un agente.

        Args:
            agent_id: ID del agente

        Returns:
            Resumen de la conversación
        """
        history = self.get_conversation_history(agent_id)
        if not history:
            return "No hay historial de conversación"

        messages_summary = []
        for msg in history[-10:]:  # Últimos 10 mensajes
            messages_summary.append(f"{msg.role}: {msg.content[:100]}")

        return "\n".join(messages_summary)

    async def persist_memory(self, agent_id: str) -> bool:
        """
        Persistir la memoria del agente al almacén de largo plazo.

        Args:
            agent_id: ID del agente

        Returns:
            True si se guardó exitosamente, False en caso contrario
        """
        try:
            history = self.get_conversation_history(agent_id)
            if history:
                await self.long_term_store.save_conversation(agent_id, history)
                return True
            return False
        except Exception as e:
            print(f"Error persistiendo memoria del agente {agent_id}: {e}")
            return False

    async def load_memory(self, agent_id: str) -> bool:
        """
        Cargar la memoria del agente desde el almacén de largo plazo.

        Args:
            agent_id: ID del agente

        Returns:
            True si se cargó exitosamente, False en caso contrario
        """
        try:
            history = await self.long_term_store.load_conversation(agent_id)
            if history:
                for message in history:
                    self.add_message(
                        agent_id,
                        message.role,
                        message.content,
                        message.metadata
                    )
                return True
            return False
        except Exception as e:
            print(f"Error cargando memoria del agente {agent_id}: {e}")
            return False
