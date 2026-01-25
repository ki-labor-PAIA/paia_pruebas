from typing import List


def normalize_whatsapp_phone(phone: str) -> List[str]:
    """
    Normaliza números de WhatsApp para manejar diferencias de formato por país.

    Casos soportados:

    1. México (12-13 dígitos):
       - 524425498784 (52 + 10 dígitos) ↔ 5214425498784 (52 + 1 móvil + 10 dígitos)

    2. USA/Canadá (10-11 dígitos):
       - 6505644482 (10 dígitos) ↔ 16505644482 (1 + 10 dígitos)

    Args:
        phone: Número a normalizar

    Returns:
        Lista de variantes a intentar [original, alternativa]

    Ejemplos:
        >>> normalize_whatsapp_phone("5214425498784")
        ["5214425498784", "524425498784"]

        >>> normalize_whatsapp_phone("524425498784")
        ["524425498784", "5214425498784"]

        >>> normalize_whatsapp_phone("16505644482")
        ["16505644482", "6505644482"]

        >>> normalize_whatsapp_phone("6505644482")
        ["6505644482", "16505644482"]
    """
    variants = [phone]  # Siempre intentar el original primero

    phone_len = len(phone)

    # Caso 1: México (12-13 dígitos con código 52)
    if phone.startswith("521") and phone_len >= 12:
        # Remover el "1" móvil: 5214425498784 -> 524425498784
        alt_phone = "52" + phone[3:]
        variants.append(alt_phone)
    elif phone.startswith("52") and phone_len >= 12 and not phone.startswith("521"):
        # Agregar el "1" móvil: 524425498784 -> 5214425498784
        alt_phone = "521" + phone[2:]
        variants.append(alt_phone)

    # Caso 2: USA/Canadá (10-11 dígitos con código 1)
    elif phone.startswith("1") and phone_len == 11:
        # Remover código de país: 16505644482 -> 6505644482
        alt_phone = phone[1:]
        variants.append(alt_phone)
    elif phone_len == 10 and not phone.startswith("52"):
        # Agregar código de país USA/Canadá: 6505644482 -> 16505644482
        alt_phone = "1" + phone
        variants.append(alt_phone)

    return variants
