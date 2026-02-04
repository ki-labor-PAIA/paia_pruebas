"""
Script para crear un usuario de prueba, un agente vinculado a un número de WhatsApp y algunos documentos de ejemplo en Supabase
Ejecutar: python scripts/seed_rag_data.py
"""
import asyncio

from auth_manager_supabase import AuthManager
from db_manager_supabase import DatabaseManager
from long_term_store_supabase import LongTermStoreSupabase


async def main():
    auth = AuthManager()
    db = DatabaseManager()
    lt = LongTermStoreSupabase()

    # 1) Crear usuario de prueba
    email = "test_whatsapp@example.com"
    password = "test1234"
    name = "Test WhatsApp"

    try:
        user = await auth.create_user(email=email, password=password, name=name)
        print(f"Usuario creado: {user.id}")
        user_id = user.id
    except Exception as e:
        print(f"Usuario ya existe o error: {e}")
        existing = await auth.get_user_by_email(email)
        user_id = existing.id

    # 2) Crear agente vinculado al número de WhatsApp (ajusta el número a tu simulación)
    agent_data = {
        "user_id": user_id,
        "name": "Agente WhatsApp POC",
        "description": "Agente para pruebas RAG via WhatsApp",
        "personality": "friendly",
        "expertise": "general",
        "status": "active",
        "mcp_endpoint": "",
        "is_public": False,
        "telegram_chat_id": None,
        "whatsapp_phone_number": "5215550000000",  # Cambia por el número que usarás en el payload
        "is_persistent": True,
        "auto_start": False
    }

    try:
        db_agent = await db.create_agent(agent_data)
        print(f"Agente creado: {db_agent.id}")
    except Exception as e:
        print(f"Agente ya existe o error: {e}")
        # Intentar buscar por número
        db_agent = await db.get_agent_by_whatsapp_phone(agent_data["whatsapp_phone_number"])
        if db_agent:
            print(f"Agente existente: {db_agent.id}")

    # 3) Ingestar documentos de ejemplo
    docs = [
        "Contrato de arrendamiento: El arrendatario deberá pagar la renta antes del día 5 de cada mes.",
        "Cláusula de fianza: El depositante debe entregar una fianza equivalente a un mes de renta.",
        "Terminación: El contrato podrá terminarse con 30 días de aviso por cualquiera de las partes.",
        "Política de cancelación: No se reembolsa el depósito en caso de incumplimiento." 
    ]

    inserted = 0
    for d in docs:
        key = f"doc:example:{str(inserted)}"
        try:
            await lt.set(f"user:{user_id}|docs", key, d)
            inserted += 1
        except Exception as e:
            print(f"Error insertando documento: {e}")

    print(f"Documentos insertados: {inserted}")

if __name__ == "__main__":
    asyncio.run(main())