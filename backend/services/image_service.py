"""
Image service: saves uploaded images locally to static/uploads/.
"""
import os
import uuid
from fastapi import UploadFile

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "uploads")


async def save_image(file: UploadFile, folder: str = "general") -> str:
    save_dir = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(save_dir, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(save_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return f"/uploads/{folder}/{filename}"
