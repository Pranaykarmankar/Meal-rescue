"""
Role-based access control and other FastAPI dependencies.
"""
from functools import wraps
from fastapi import Depends, HTTPException, status
from auth import get_current_user
from models import User


def require_role(*roles: str):
    """
    FastAPI dependency that checks the current user has one of the allowed roles.
    Usage: current_user = Depends(require_role("merchant"))
    """
    async def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}",
            )
        return current_user
    return dependency
