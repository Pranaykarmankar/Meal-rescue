"""
Email service: stubbed for development (logs to console).
"""
import logging

logger = logging.getLogger(__name__)


async def send_favorite_alert(to_email: str, shop_name: str, qty: int, pickup_start: str, pickup_end: str):
    """Send email alert when a favorited shop posts new boxes. Stubbed for dev."""
    logger.info(f"[EMAIL STUB] To: {to_email} | {shop_name} just dropped {qty} Surprise Boxes! Pickup: {pickup_start} - {pickup_end}")
    return True
