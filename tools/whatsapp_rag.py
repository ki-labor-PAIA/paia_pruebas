"""
Utilities to handle RAG requests coming from WhatsApp (POC)
"""
from typing import Optional


def is_rag_query(text: str) -> bool:
    if not text:
        return False
    txt = text.strip().lower()
    return txt.startswith("buscar:") or txt.startswith("rag:") or txt.startswith("buscar ")


async def handle_whatsapp_rag(whatsapp_service, rag_service, db_agent, message_text: str):
    """Simple handler:
    - Obtiene user_id del agent
    - Llama a rag_service.query
    - Envía la respuesta al número que originó el mensaje (db_agent.whatsapp_phone_number)
    """
    user_id = db_agent.user_id
    customer_phone = db_agent.whatsapp_phone_number

    # Aviso inicial
    try:
        whatsapp_service.send_text_message(to_phone=customer_phone, message="Buscando en tus documentos... 🔎")
    except Exception as e:
        print(f"[WhatsApp RAG] No se pudo enviar mensaje de confirmación: {e}")

    # Preparar términos de búsqueda: quitar prefijo "buscar:" si existe
    text = message_text
    if ":" in text:
        text = text.split(":", 1)[1].strip()

    answer = await rag_service.query(user_id, text, k=4)

    # Enviar respuesta final
    try:
        whatsapp_service.send_text_message(to_phone=customer_phone, message=answer)
    except Exception as e:
        print(f"[WhatsApp RAG] Error enviando respuesta: {e}")


async def handle_whatsapp_attachment(whatsapp_service, rag_service, db_agent, attachment: dict):
    """Descargar un attachment desde WhatsApp y pasarlo al RAG Service para indexarlo.

    attachment: {type, media_id, mime_type, filename}
    """
    user_id = db_agent.user_id
    customer_phone = db_agent.whatsapp_phone_number

    # Confirmación inmediata
    try:
        whatsapp_service.send_text_message(to_phone=customer_phone, message="Archivo recibido, lo estoy procesando y te aviso cuando termine.")
    except Exception as e:
        print(f"[WhatsApp RAG] No se pudo enviar confirmación de recepción: {e}")

    # Descargar media
    media_id = attachment.get('media_id')
    if not media_id:
        try:
            whatsapp_service.send_text_message(to_phone=customer_phone, message="No pude obtener el archivo adjunto.")
        except Exception:
            pass
        return

    media_bytes = whatsapp_service.download_media(media_id)
    if not media_bytes:
        try:
            whatsapp_service.send_text_message(to_phone=customer_phone, message="Error descargando el archivo adjunto.")
        except Exception:
            pass
        return

    filename = attachment.get('filename') or f"attachment_{media_id}"
    mime_type = attachment.get('mime_type')

    # Llamar a RAG Service para procesar el archivo
    try:
        inserted = await rag_service.ingest_file(user_id=user_id, file_bytes=media_bytes, filename=filename, mime_type=mime_type, source='whatsapp')
        try:
            whatsapp_service.send_text_message(to_phone=customer_phone, message=f"Indexado {inserted} fragmentos del archivo '{filename}'. ✅")
        except Exception:
            pass
    except Exception as e:
        print(f"[WhatsApp RAG] Error indexando archivo: {e}")
        try:
            whatsapp_service.send_text_message(to_phone=customer_phone, message="Ocurrió un error indexando tu archivo.")
        except Exception:
            pass
