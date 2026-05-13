"""
QR service: TOTP generation and verification using pyotp.
"""
import pyotp
import time


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_current_token(secret: str) -> dict:
    totp = pyotp.TOTP(secret, interval=30)
    token = totp.now()
    time_remaining = 30 - (int(time.time()) % 30)
    return {"token": token, "expires_in": time_remaining}


def verify_token(secret: str, token: str) -> bool:
    totp = pyotp.TOTP(secret, interval=30)
    return totp.verify(token, valid_window=1)
