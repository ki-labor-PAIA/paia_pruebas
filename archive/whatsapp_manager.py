"""
WhatsApp Manager - Gestiona la asociación entre agentes y números de WhatsApp
Almacenamiento local en archivo JSON para pruebas
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, List
from threading import Lock
from pathlib import Path


class WhatsAppManager:
    """Gestor de asociaciones agente-WhatsApp con almacenamiento local"""

    def __init__(self, storage_file: str = "whatsapp_agent_mappings.json"):
        """
        Inicializa el gestor de WhatsApp

        Args:
            storage_file: Ruta al archivo JSON de almacenamiento
        """
        self.storage_file = storage_file
        self.lock = Lock()  # Thread-safe para escrituras concurrentes
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Asegura que el archivo de almacenamiento existe"""
        if not os.path.exists(self.storage_file):
            initial_data = {
                "schema_version": "1.0",
                "mappings": {}
            }
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f, indent=2, ensure_ascii=False)
            print(f"[WhatsApp Manager] 📁 Archivo creado: {self.storage_file}")

    def _load_mappings(self) -> Dict:
        """Carga las asociaciones desde el archivo JSON"""
        try:
            with open(self.storage_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('mappings', {})
        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error cargando archivo: {e}")
            return {}

    def _save_mappings(self, mappings: Dict):
        """Guarda las asociaciones en el archivo JSON"""
        with self.lock:
            try:
                data = {
                    "schema_version": "1.0",
                    "mappings": mappings,
                    "last_updated": datetime.now().isoformat()
                }
                with open(self.storage_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"[WhatsApp Manager] ❌ Error guardando archivo: {e}")
                raise

    def save_agent_whatsapp(self, agent_id: str, phone_number: str, agent_name: str) -> bool:
        """
        Guarda la asociación entre un agente y un número de WhatsApp

        Args:
            agent_id: ID del agente
            phone_number: Número de WhatsApp (formato internacional)
            agent_name: Nombre del agente

        Returns:
            bool: True si se guardó exitosamente
        """
        try:
            mappings = self._load_mappings()

            mappings[agent_id] = {
                "phone_number": phone_number,
                "agent_name": agent_name,
                "enabled": True,
                "created_at": datetime.now().isoformat(),
                "messages_sent": 0,
                "last_message_at": None,
                "last_error": None
            }

            self._save_mappings(mappings)
            print(f"[WhatsApp Manager] ✅ Asociación guardada: {agent_id} → {phone_number} ({agent_name})")
            return True

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error guardando asociación: {e}")
            return False

    def get_agent_whatsapp(self, agent_id: str) -> Optional[str]:
        """
        Obtiene el número de WhatsApp asociado a un agente

        Args:
            agent_id: ID del agente

        Returns:
            str o None: Número de WhatsApp o None si no existe
        """
        try:
            mappings = self._load_mappings()
            mapping = mappings.get(agent_id)

            if mapping and mapping.get('enabled', True):
                return mapping.get('phone_number')

            return None

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error obteniendo número: {e}")
            return None

    def has_whatsapp(self, agent_id: str) -> bool:
        """
        Verifica si un agente tiene WhatsApp configurado y habilitado

        Args:
            agent_id: ID del agente

        Returns:
            bool: True si tiene WhatsApp configurado y habilitado
        """
        phone = self.get_agent_whatsapp(agent_id)
        return phone is not None

    def update_message_stats(self, agent_id: str, success: bool = True, error_message: str = None):
        """
        Actualiza las estadísticas de mensajes de un agente

        Args:
            agent_id: ID del agente
            success: Si el mensaje se envió exitosamente
            error_message: Mensaje de error si falló
        """
        try:
            mappings = self._load_mappings()

            if agent_id in mappings:
                if success:
                    mappings[agent_id]['messages_sent'] += 1
                    mappings[agent_id]['last_message_at'] = datetime.now().isoformat()
                    mappings[agent_id]['last_error'] = None
                else:
                    mappings[agent_id]['last_error'] = error_message

                self._save_mappings(mappings)

        except Exception as e:
            print(f"[WhatsApp Manager] ⚠️ Error actualizando estadísticas: {e}")

    def toggle_agent_whatsapp(self, agent_id: str) -> bool:
        """
        Activa o desactiva el envío automático de WhatsApp para un agente

        Args:
            agent_id: ID del agente

        Returns:
            bool: True si se actualizó exitosamente
        """
        try:
            mappings = self._load_mappings()

            if agent_id not in mappings:
                return False

            mappings[agent_id]['enabled'] = not mappings[agent_id].get('enabled', True)
            self._save_mappings(mappings)

            status = "habilitado" if mappings[agent_id]['enabled'] else "deshabilitado"
            print(f"[WhatsApp Manager] 🔄 WhatsApp {status} para agente {agent_id}")
            return True

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error cambiando estado: {e}")
            return False

    def remove_agent_whatsapp(self, agent_id: str) -> bool:
        """
        Elimina la asociación WhatsApp de un agente

        Args:
            agent_id: ID del agente

        Returns:
            bool: True si se eliminó exitosamente
        """
        try:
            mappings = self._load_mappings()

            if agent_id not in mappings:
                return False

            agent_name = mappings[agent_id].get('agent_name', agent_id)
            del mappings[agent_id]
            self._save_mappings(mappings)

            print(f"[WhatsApp Manager] 🗑️ Asociación eliminada: {agent_id} ({agent_name})")
            return True

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error eliminando asociación: {e}")
            return False

    def list_all_mappings(self) -> List[Dict]:
        """
        Lista todas las asociaciones WhatsApp-Agente

        Returns:
            List[Dict]: Lista de asociaciones con sus detalles
        """
        try:
            mappings = self._load_mappings()

            result = []
            for agent_id, data in mappings.items():
                result.append({
                    "agent_id": agent_id,
                    "agent_name": data.get('agent_name'),
                    "phone_number": data.get('phone_number'),
                    "enabled": data.get('enabled', True),
                    "messages_sent": data.get('messages_sent', 0),
                    "created_at": data.get('created_at'),
                    "last_message_at": data.get('last_message_at'),
                    "last_error": data.get('last_error')
                })

            return result

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error listando asociaciones: {e}")
            return []

    def get_agent_info(self, agent_id: str) -> Optional[Dict]:
        """
        Obtiene toda la información de la asociación WhatsApp de un agente

        Args:
            agent_id: ID del agente

        Returns:
            Dict o None: Información completa de la asociación
        """
        try:
            mappings = self._load_mappings()

            if agent_id in mappings:
                return {
                    "agent_id": agent_id,
                    **mappings[agent_id]
                }

            return None

        except Exception as e:
            print(f"[WhatsApp Manager] ❌ Error obteniendo info del agente: {e}")
            return None


# Test básico
if __name__ == "__main__":
    print("=== Test de WhatsApp Manager ===\n")

    manager = WhatsAppManager("test_whatsapp_mappings.json")

    # Test 1: Guardar asociación
    print("Test 1: Guardar asociación")
    manager.save_agent_whatsapp("agent-123", "524425498784", "María Asistente")
    manager.save_agent_whatsapp("agent-456", "5491123456789", "Pedro Soporte")

    # Test 2: Obtener número
    print("\nTest 2: Obtener número")
    phone = manager.get_agent_whatsapp("agent-123")
    print(f"Número de agent-123: {phone}")

    # Test 3: Verificar si tiene WhatsApp
    print("\nTest 3: Verificar si tiene WhatsApp")
    has_wa = manager.has_whatsapp("agent-123")
    print(f"agent-123 tiene WhatsApp: {has_wa}")

    # Test 4: Actualizar estadísticas
    print("\nTest 4: Actualizar estadísticas")
    manager.update_message_stats("agent-123", success=True)
    manager.update_message_stats("agent-123", success=True)

    # Test 5: Listar asociaciones
    print("\nTest 5: Listar todas las asociaciones")
    mappings = manager.list_all_mappings()
    for mapping in mappings:
        print(f"  - {mapping['agent_name']}: {mapping['phone_number']} ({mapping['messages_sent']} mensajes)")

    # Test 6: Toggle
    print("\nTest 6: Desactivar/Activar WhatsApp")
    manager.toggle_agent_whatsapp("agent-123")
    has_wa_after = manager.has_whatsapp("agent-123")
    print(f"agent-123 tiene WhatsApp después de toggle: {has_wa_after}")

    manager.toggle_agent_whatsapp("agent-123")
    has_wa_final = manager.has_whatsapp("agent-123")
    print(f"agent-123 tiene WhatsApp después de segundo toggle: {has_wa_final}")

    print("\n✅ Tests completados")
