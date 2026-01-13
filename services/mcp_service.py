from typing import Optional, Dict, Any
from langchain_mcp_adapters.client import MultiServerMCPClient


class MCPService:
    """
    Servicio para gestión de clientes MCP (Model Context Protocol).

    Proporciona funcionalidad para crear y gestionar clientes MCP
    específicos por usuario, permitiendo acceso a herramientas externas
    como Google Calendar.
    """

    def __init__(self, mcp_url: str = "http://127.0.0.1:3000/api/mcp"):
        """
        Inicializar el servicio de MCP.

        Args:
            mcp_url: URL base del servidor MCP
        """
        self.mcp_url = mcp_url
        self.clients_cache: Dict[str, MultiServerMCPClient] = {}

    async def get_mcp_client_for_user(self, user_id: str) -> Optional[MultiServerMCPClient]:
        """
        Crear o recuperar cliente MCP con contexto de usuario específico.

        Args:
            user_id: ID del usuario

        Returns:
            Cliente MCP configurado o None si hay error
        """
        # Verificar si ya existe en cache
        if user_id in self.clients_cache:
            return self.clients_cache[user_id]

        try:
            client = MultiServerMCPClient({
                "google_calendar": {
                    "url": self.mcp_url,
                    "transport": "streamable_http",
                    "headers": {"x-user-id": user_id}
                }
            })

            # Guardar en cache
            self.clients_cache[user_id] = client

            print(f"[MCP] Cliente creado para usuario {user_id}")
            return client

        except Exception as e:
            print(f"[MCP] Error configurando cliente para usuario {user_id}: {e}")
            return None

    async def get_tools_for_user(self, user_id: str) -> list:
        """
        Obtener herramientas MCP disponibles para un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Lista de herramientas MCP disponibles
        """
        client = await self.get_mcp_client_for_user(user_id)
        if not client:
            return []

        try:
            tools = await client.get_tools()
            print(f"[MCP] {len(tools)} herramientas disponibles para usuario {user_id}")
            return tools
        except Exception as e:
            print(f"[MCP] Error obteniendo herramientas para usuario {user_id}: {e}")
            return []

    def clear_client_cache(self, user_id: Optional[str] = None) -> None:
        """
        Limpiar cache de clientes MCP.

        Args:
            user_id: ID del usuario específico o None para limpiar todos
        """
        if user_id:
            if user_id in self.clients_cache:
                del self.clients_cache[user_id]
                print(f"[MCP] Cache limpiado para usuario {user_id}")
        else:
            self.clients_cache.clear()
            print("[MCP] Cache de clientes limpiado completamente")

    async def test_mcp_connection(self, user_id: str) -> bool:
        """
        Probar conexión MCP para un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            True si la conexión es exitosa, False en caso contrario
        """
        try:
            client = await self.get_mcp_client_for_user(user_id)
            if not client:
                return False

            tools = await client.get_tools()
            return len(tools) > 0

        except Exception as e:
            print(f"[MCP] Error probando conexión para usuario {user_id}: {e}")
            return False

    def get_client_info(self, user_id: str) -> Dict[str, Any]:
        """
        Obtener información del cliente MCP de un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Diccionario con información del cliente
        """
        return {
            "user_id": user_id,
            "mcp_url": self.mcp_url,
            "cached": user_id in self.clients_cache,
            "client_exists": user_id in self.clients_cache
        }

    def get_all_cached_clients(self) -> list:
        """
        Obtener lista de todos los usuarios con clientes en cache.

        Returns:
            Lista de user_ids con clientes en cache
        """
        return list(self.clients_cache.keys())


async def init_mcp_service(mcp_url: str = "http://127.0.0.1:3000/api/mcp") -> MCPService:
    """
    Inicializar el servicio MCP.

    Args:
        mcp_url: URL del servidor MCP

    Returns:
        Instancia del servicio MCP
    """
    service = MCPService(mcp_url)
    print("[MCP] Servicio MCP inicializado y listo para crear clientes bajo demanda")
    return service
