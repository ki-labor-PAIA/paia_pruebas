from typing import List


def normalize_mexican_phone(phone: str) -> List[str]:
    """
    Normaliza números mexicanos para manejar inconsistencia del "1" móvil.

    Números móviles mexicanos pueden formatearse como:
    - 524425498784 (52 + número de 10 dígitos) - formato DB
    - 5214425498784 (52 + "1" móvil + número) - formato WhatsApp

    Args:
        phone: Número a normalizar

    Returns:
        Lista de variantes a intentar [original, alternativa]

    Ejemplo:
        >>> normalize_mexican_phone("5214425498784")
        ["5214425498784", "524425498784"]

        >>> normalize_mexican_phone("524425498784")
        ["524425498784", "5214425498784"]
    """
    variants = [phone]  # Siempre intentar el original primero

    if phone.startswith("521") and len(phone) >= 12:
        # Remover el "1" móvil: 5214425498784 -> 524425498784
        alt_phone = "52" + phone[3:]
        variants.append(alt_phone)
    elif phone.startswith("52") and len(phone) >= 12 and not phone.startswith("521"):
        # Agregar el "1" móvil: 524425498784 -> 5214425498784
        alt_phone = "521" + phone[2:]
        variants.append(alt_phone)

    return variants
