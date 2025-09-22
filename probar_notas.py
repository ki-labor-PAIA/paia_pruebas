
import requests

BASE_URL = "http://localhost:8000/api/notas"

# 1. Crear una nueva nota
nueva_nota = {
    "title": "Nota de prueba",
    "content": "Este es el contenido inicial de la nota",
    "tags": ["demo", "backend"]
}

print("✅ Creando nota...")
res = requests.post(BASE_URL, json=nueva_nota)
assert res.status_code == 200, f"Error al crear nota: {res.text}"
nota = res.json()
print("✔️ Nota creada:", nota)

# 2. Obtener todas las notas
print("\n📋 Listando todas las notas...")
res = requests.get(BASE_URL)
notas = res.json()
for n in notas:
    print("-", n["title"])

# 3. Buscar una nota por texto
print("\n🔍 Buscando notas que contengan 'contenido'...")
res = requests.get(f"{BASE_URL}/buscar", params={"q": "contenido"})
resultados = res.json()
for r in resultados:
    print("🔎 Resultado:", r["title"])

# 4. Actualizar una nota
print("\n✏️ Actualizando la nota...")
nota_id = nota["id"]
res = requests.put(f"{BASE_URL}/{nota_id}", json={
    "title": "Nota de prueba actualizada",
    "content": "Este contenido ha sido editado",
    "tags": ["actualizado"]
})
assert res.status_code == 200, f"Error al actualizar: {res.text}"
print("✔️ Nota actualizada:", res.json())

# 5. Eliminar la nota
print("\n🗑️ Eliminando la nota...")
res = requests.delete(f"{BASE_URL}/{nota_id}")
assert res.status_code == 200, f"Error al eliminar: {res.text}"
print("✔️ Nota eliminada")

# 6. Confirmar que fue eliminada
print("\n📋 Confirmando eliminación...")
res = requests.get(BASE_URL)
notas_restantes = res.json()
ids_restantes = [n["id"] for n in notas_restantes]
print("📌 Notas restantes:", ids_restantes)
assert nota_id not in ids_restantes, "❌ La nota aún existe!"
print("✅ Eliminación confirmada.")
