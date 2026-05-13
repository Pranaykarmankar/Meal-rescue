import asyncio
from database import AsyncSessionLocal
from models import User, UserRole
from sqlalchemy import select
import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

async def reset_admin():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == 'admin@example.com'))
        admin = result.scalars().first()
        
        pwd_hash = hash_password("password123")
        
        if admin:
            print("Updating existing admin user...")
            admin.password_hash = pwd_hash
            admin.role = UserRole.admin
        else:
            print("Creating new admin user...")
            admin = User(
                name="System Admin",
                email="admin@example.com",
                password_hash=pwd_hash,
                role=UserRole.admin
            )
            session.add(admin)
        
        await session.commit()
        print("Admin user successfully reset to: admin@example.com / password123")

if __name__ == "__main__":
    asyncio.run(reset_admin())
