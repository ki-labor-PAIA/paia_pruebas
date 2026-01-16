"""
Communication tools for PAIA agents.
Provides functions for agent-to-agent and agent-to-user communication.
"""
import uuid
from typing import Dict, Any, List
from datetime import datetime
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage


def create_communication_tools(
    agent_id: str,
    agents_store: Dict[str, Any],
    connections_store: Dict[str, Any],
    message_history: Dict[str, List[Any]],
    telegram_service: Any,
    telegram_default_chat_id: str,
    db_manager: Any,
    auth_manager: Any,
    agent_manager: Any,
    ensure_agent_loaded_func: Any,
    gmail_service: Any, # Nueva dependencia
    AgentMessage: type
):
    """
    Create communication tools for a specific agent.
    
    Args:
        agent_id: ID of the agent these tools belong to
        agents_store: Global agents storage
        connections_store: Global connections storage
        message_history: Global message history
        telegram_service: TelegramService instance
        telegram_default_chat_id: Default Telegram chat ID
        db_manager: DatabaseManager instance
        auth_manager: AuthManager instance
        agent_manager: PAIAAgentManager instance
        ensure_agent_loaded_func: Function to ensure agent is loaded
        gmail_service: GmailService instance
        AgentMessage: AgentMessage dataclass

    Returns:
        List of communication tool functions
    """

    @tool
    def get_connected_agents() -> str:
        """
        View agents connected to you.

        Returns:
            List of connected agent names
        """
        try:
            connected = []
            for conn in connections_store.values():
                if conn.agent1 == agent_id and conn.agent2 in agents_store:
                    other_agent = agents_store[conn.agent2]
                    connected.append(f"{other_agent.name} (ID: {other_agent.id})")
                elif conn.agent2 == agent_id and conn.agent1 in agents_store:
                    other_agent = agents_store[conn.agent1]
                    connected.append(f"{other_agent.name} (ID: {other_agent.id})")

            return f"Conectado con: {', '.join(connected)}" if connected else "Sin conexiones"
        except Exception as e:
            return f"Error obteniendo conexiones: {str(e)}"

    @tool
    async def send_notification_to_user(user_name: str, message: str, priority: str = "normal") -> str:
        """
        Send direct notification to a connected user.

        Args:
            user_name: User name or email
            message: Message to send
            priority: Priority level (low, normal, high, urgent)

        Returns:
            Confirmation of send status
        """
        try:
            # Search user by name or email
            users = await db_manager.search_users(user_name, exclude_user_id=agent_id, limit=5)

            if not users:
                return f"❌ No se encontró usuario '{user_name}'"

            target_user = users[0]  # Take first result

            # Create notification
            await db_manager.create_notification({
                'user_id': target_user['id'],
                'agent_id': agent_id,
                'title': f'Mensaje de {agents_store.get(agent_id, {}).name if agent_id in agents_store else "Agente"}',
                'content': message,
                'notification_type': 'message',
                'priority': priority
            })

            # Also send via Telegram if configured
            sender_agent = agents_store.get(agent_id)
            if sender_agent and sender_agent.telegram_chat_id:
                telegram_msg = f"📨 Mensaje enviado a {target_user['name']}:\n\n{message}"
                telegram_service.send_message(sender_agent.telegram_chat_id, telegram_msg)

            return f"✅ Notificación enviada a {target_user['name']} ({target_user['email']})"

        except Exception as e:
            return f"❌ Error enviando notificación: {str(e)}"

    @tool
    async def ask_connected_agent(target_agent_id: str, question: str, context: str = "") -> str:
        """
        Ask an intelligent question to a specific agent using their ID.
        Perfect for calendar queries, availability checks, etc.

        Args:
            target_agent_id: ID of the specific agent to query
            question: Specific question (e.g., "Are you available tomorrow at 7pm?")
            context: Optional additional context

        Returns:
            Response from the queried agent
        """
        try:
            # IMPROVEMENT: Intelligent auto-activation of agents
            target_agent = await ensure_agent_loaded_func(target_agent_id)

            if not target_agent:
                print(f"[AUTO-WAKE] Attempting to activate agent {target_agent_id}...")

                # Search agent in database
                db_agent = await db_manager.get_agent(target_agent_id)
                if not db_agent:
                    return f"❌ El agente con ID '{target_agent_id}' no existe en el sistema."

                # Try to load agent with their user_id
                target_agent = await ensure_agent_loaded_func(target_agent_id, db_agent.user_id)

                if target_agent:
                    # Mark as active and log activation
                    await db_manager.update_agent(target_agent_id, {"status": "online"})
                    print(f"[AUTO-WAKE] ✅ Agente '{db_agent.name}' (usuario: {db_agent.user_id}) activado automáticamente")

                    # Add small delay to ensure agent is fully initialized
                    import asyncio
                    await asyncio.sleep(0.5)
                else:
                    return f"❌ No se pudo activar el agente '{target_agent_id}'. El usuario propietario podría no estar disponible."

            if not target_agent:
                return f"❌ El agente con ID '{target_agent_id}' no está disponible en este momento."

            # Build intelligent message
            sender_agent = agents_store.get(agent_id)
            sender_name = sender_agent.name if sender_agent else "Un agente"

            intelligent_prompt = f"""Pregunta de {sender_name}: {question}

Contexto adicional: {context}

Por favor responde de manera útil y directa. Si la pregunta es sobre disponibilidad o calendario, consulta el calendario de tu usuario ({target_agent.user_id}) usando las herramientas disponibles."""

            print(f"[INTER-PAIA] 🔊 {sender_name} preguntando a {target_agent.name}: '{question[:50]}{'...' if len(question) > 50 else ''}'")

            # Send message to target agent
            try:
                response = await target_agent.llm_instance.ainvoke({
                    "messages": [HumanMessage(content=intelligent_prompt)]
                })

                response_content = response["messages"][-1].content
                print(f"[INTER-PAIA] ✅ {target_agent.name} respondió exitosamente ({len(response_content)} caracteres)")

            except Exception as llm_error:
                print(f"[INTER-PAIA] ❌ Error en LLM del agente {target_agent.name}: {str(llm_error)}")
                return f"❌ Error procesando consulta en el agente {target_agent.name}. Por favor intenta más tarde."

            # Save conversation in DB
            try:
                conversation_id = f"intelligent_{agent_id}_{target_agent_id}"
                await db_manager.save_message({
                    'conversation_id': conversation_id,
                    'from_agent_id': agent_id,
                    'to_agent_id': target_agent_id,
                    'content': question,
                    'message_type': 'intelligent_query'
                })

                await db_manager.save_message({
                    'conversation_id': conversation_id,
                    'from_agent_id': target_agent_id,
                    'to_agent_id': agent_id,
                    'content': response_content,
                    'message_type': 'intelligent_response'
                })
                print(f"[INTER-PAIA] 💾 Conversación guardada en BD: {conversation_id}")

            except Exception as db_error:
                print(f"[INTER-PAIA] ⚠️ Error guardando conversación en BD: {str(db_error)}")
                # Don't fail the function just because DB save failed

            # Get user data from agent for clearer message
            try:
                target_user = await auth_manager.get_user_by_id(target_agent.user_id)
                user_name_info = f" (agente de {target_user.name})" if target_user else ""
            except Exception:
                user_name_info = ""

            print(f"[INTER-PAIA] 🎉 Consulta inter-PAIA completada exitosamente")
            return f"✅ {target_agent.name}{user_name_info} responde:\n\n{response_content}"

        except Exception as e:
            print(f"[INTER-PAIA] ❌ Error general en ask_connected_agent: {str(e)}")
            return f"❌ Error inesperado consultando agente '{target_agent_id}': {str(e)}"

    @tool
    async def send_message_to_agent(target_agent_id: str, message: str, notify_telegram: bool = False) -> str:
        """
        Send message to another agent and get response.

        Args:
            target_agent_id: Target agent ID
            message: Message to send
            notify_telegram: If True, also sends Telegram notification

        Returns:
            Agent's response
        """
        try:
            sender_id = agent_id

            is_connected = any(
                (conn.agent1 == sender_id and conn.agent2 == target_agent_id) or
                (conn.agent1 == target_agent_id and conn.agent2 == sender_id)
                for conn in connections_store.values()
            )

            if not is_connected:
                return f"❌ Error: No estás conectado con el agente {target_agent_id}"

            if target_agent_id not in agents_store:
                return f"❌ Error: Agente {target_agent_id} no encontrado"

            conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"

            sent_message = AgentMessage(
                id=str(uuid.uuid4())[:8],
                from_agent=sender_id,
                to_agent=target_agent_id,
                content=message,
                timestamp=datetime.now().isoformat(),
                conversation_id=conversation_id,
                telegram_sent=notify_telegram
            )

            if conversation_id not in message_history:
                message_history[conversation_id] = []
            message_history[conversation_id].append(sent_message)

            # Get response
            response = await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)
            target_agent_name = agents_store[target_agent_id].name

            # If Telegram notification was requested
            if notify_telegram:
                sender_agent = agents_store.get(sender_id)
                telegram_msg = f"💬 Conversación entre agentes:\n\n{sender_agent.name} → {target_agent_name}:\n{message}\n\n{response}"
                telegram_service.send_message(
                    sender_agent.telegram_chat_id if sender_agent else telegram_default_chat_id,
                    telegram_msg
                )

            return f"✅ Mensaje enviado a {target_agent_name}.\n📩 {response}"

        except Exception as e:
            return f"❌ Error enviando mensaje: {str(e)}"

    @tool
    async def get_agent_response(target_agent_id: str) -> str:
        """
        Get the last response from a specific agent.

        Args:
            target_agent_id: Target agent ID

        Returns:
            Agent's last response
        """
        try:
            sender_id = agent_id
            conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"

            if conversation_id not in message_history:
                return "No hay conversación iniciada con ese agente."

            messages = message_history[conversation_id]
            for message in reversed(messages):
                if message.from_agent == target_agent_id:
                    agent_name = agents_store[target_agent_id].name
                    return f"{agent_name} respondió: \"{message.content}\""

            return await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)

        except Exception as e:
            return f"❌ Error obteniendo respuesta: {str(e)}"

    @tool
    def get_conversation_history(target_agent_id: str) -> str:
        """
        Get complete conversation history with an agent.

        Args:
            target_agent_id: Target agent ID

        Returns:
            Full conversation history
        """
        try:
            sender_id = agent_id
            conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"

            if conversation_id not in message_history:
                return "No hay historial de conversación con ese agente."

            history = []
            for msg in message_history[conversation_id]:
                sender_name = agents_store[msg.from_agent].name
                telegram_mark = " 📱" if msg.telegram_sent else ""
                history.append(f"{sender_name}: {msg.content}{telegram_mark}")

            return "Historial de conversación:\n" + "\n".join(history)

        except Exception as e:
            return f"❌ Error obteniendo historial: {str(e)}"

    @tool
    async def send_gmail(to: str, subject: str, message: str) -> str:
        """
        Send an email using the user's connected Gmail account.
        Use this when the user explicitly asks to send an email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            message: Email body content
            
        Returns:
            Status message
        """
        try:
            # 1. Get the owner user of this agent
            agent = agents_store.get(agent_id)
            if not agent:
                return "❌ Error: Agent not found internally."
                
            user_id = agent.user_id
            
            # 2. Send email using GmailService
            result = await gmail_service.send_email(user_id, to, subject, message)
            
            if result["success"]:
                return f"✅ Email enviado a {to} (ID: {result['message_id']})"
            else:
                return f"❌ Error enviando email: {result['error']}. Asegúrate de haber conectado tu cuenta de Gmail."

        except Exception as e:
            return f"❌ Error inesperado: {str(e)}"

    return [
        get_connected_agents,
        send_notification_to_user,
        ask_connected_agent,
        send_message_to_agent,
        get_agent_response,
        get_conversation_history,
        send_gmail
    ]
