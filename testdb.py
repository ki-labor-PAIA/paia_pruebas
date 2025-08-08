# test_pg_connection.py
import asyncio
from long_term_store_pg import LongTermStorePG

async def main():
    store = LongTermStorePG()
    try:
        # Inicializa la tabla si no existe
        await store.init_db()
        print("✅ Conexión exitosa y tabla creada/verificada")

        # Prueba de escritura y lectura
        await store.set("user:123|persona:Demo", "idioma", "español")
        data = await store.get_all("user:123|persona:Demo")
        print("📦 Datos obtenidos:", data)

    except Exception as e:
        print("❌ Error de conexión o consulta:", e)

if __name__ == "__main__":
    asyncio.run(main())
