"""
Expertise-specific tools for PAIA agents.
Provides specialized tools based on agent expertise (scheduling, travel, research).
"""
from typing import List, Dict, Any
from langchain_core.tools import tool


def create_scheduling_tools(
    agent_id: str,
    agents_store: Dict[str, Any],
    telegram_service: Any
):
    """
    Create scheduling-specific tools.

    Args:
        agent_id: ID of the agent
        agents_store: Global agents storage
        telegram_service: TelegramService instance

    Returns:
        List of scheduling tool functions
    """

    @tool
    def schedule_meeting(
        title: str,
        date: str,
        participants: List[str],
        telegram_reminder: bool = False
    ) -> str:
        """
        Schedule a meeting with optional Telegram reminder.

        Args:
            title: Meeting title
            date: Meeting date/time
            participants: List of participant names
            telegram_reminder: Whether to send Telegram reminder

        Returns:
            Confirmation message
        """
        result = f"✅ Reunión '{title}' programada para {date} con {', '.join(participants)}"

        if telegram_reminder:
            agent = agents_store.get(agent_id)
            if agent and agent.telegram_chat_id:
                telegram_msg = f"📅 Recordatorio de reunión:\n{title}\n📆 {date}\n👥 {', '.join(participants)}"
                telegram_service.send_message(agent.telegram_chat_id, telegram_msg)
                result += " (Recordatorio enviado por Telegram)"

        return result

    return [schedule_meeting]


def create_travel_tools(
    agent_id: str,
    agents_store: Dict[str, Any],
    telegram_service: Any
):
    """
    Create travel-specific tools.

    Args:
        agent_id: ID of the agent
        agents_store: Global agents storage
        telegram_service: TelegramService instance

    Returns:
        List of travel tool functions
    """

    @tool
    def book_flight(
        from_city: str,
        to_city: str,
        date: str,
        send_confirmation: bool = False
    ) -> str:
        """
        Book a flight with optional Telegram confirmation.

        Args:
            from_city: Departure city
            to_city: Destination city
            date: Flight date
            send_confirmation: Whether to send Telegram confirmation

        Returns:
            Confirmation message
        """
        result = f"✈️ Vuelo reservado de {from_city} a {to_city} para {date}"

        if send_confirmation:
            agent = agents_store.get(agent_id)
            if agent and agent.telegram_chat_id:
                telegram_msg = f"✈️ Confirmación de vuelo:\n{from_city} → {to_city}\n📆 {date}"
                telegram_service.send_message(agent.telegram_chat_id, telegram_msg)
                result += " (Confirmación enviada por Telegram)"

        return result

    @tool
    def book_hotel(city: str, checkin: str, checkout: str) -> str:
        """
        Book a hotel.

        Args:
            city: Hotel city
            checkin: Check-in date
            checkout: Check-out date

        Returns:
            Confirmation message
        """
        return f"🏨 Hotel reservado en {city} del {checkin} al {checkout}"

    return [book_flight, book_hotel]


def create_research_tools():
    """
    Create research-specific tools.

    Returns:
        List of research tool functions
    """

    @tool
    def web_search(query: str) -> str:
        """
        Perform a web search (simulated).

        Args:
            query: Search query

        Returns:
            Search results message
        """
        return f"🔍 Resultados de búsqueda para: {query}"

    return [web_search]


def get_expertise_tools(
    expertise: str,
    agent_id: str,
    agents_store: Dict[str, Any],
    telegram_service: Any
) -> List:
    """
    Get tools based on agent expertise.

    Args:
        expertise: Agent expertise type
        agent_id: ID of the agent
        agents_store: Global agents storage
        telegram_service: TelegramService instance

    Returns:
        List of expertise-specific tools
    """
    if expertise == "scheduling":
        return create_scheduling_tools(agent_id, agents_store, telegram_service)
    elif expertise == "travel":
        return create_travel_tools(agent_id, agents_store, telegram_service)
    elif expertise == "research":
        return create_research_tools()
    else:
        return []
