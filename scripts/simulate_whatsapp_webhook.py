"""
Simular envío de webhook de WhatsApp a la ruta local `/api/webhooks/whatsapp`.
Ejecutar: python scripts/simulate_whatsapp_webhook.py
"""
import json
import requests

PAYLOAD_FILE = "tests/fixtures/whatsapp_search_payload.json"
URL = "http://localhost:8000/api/webhooks/whatsapp"

with open(PAYLOAD_FILE, "r", encoding="utf-8") as f:
    payload = json.load(f)

resp = requests.post(URL, json=payload)
print("Status:", resp.status_code)
try:
    print(resp.json())
except Exception:
    print(resp.text)