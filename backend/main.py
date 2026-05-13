"""
Meal-Rescue — FastAPI application entry point.
Mounts all routers, serves frontend static files, starts scheduler.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

load_dotenv()

from database import init_db
from routers import auth, boxes, orders, merchants, admin, favorites, notifications, websocket, stats
from services.flash_drop import flash_drop_job

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # Create database tables
    await init_db()
    print("[OK] Database tables created")

    # Start flash-drop scheduler
    scheduler.add_job(flash_drop_job, "interval", minutes=5, id="flash_drop")
    scheduler.start()
    print("[OK] Flash-drop scheduler started (every 5 min)")

    yield

    # Shutdown
    scheduler.shutdown()


app = FastAPI(
    title="Meal-Rescue API",
    description="Hyper-local food rescue marketplace",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router)
app.include_router(boxes.router)
app.include_router(orders.router)
app.include_router(merchants.router)
app.include_router(admin.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(websocket.router)
app.include_router(stats.router)

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

# Mount CSS, JS, uploads as static
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

# Create uploads dir if not exists
uploads_dir = os.path.join(FRONTEND_DIR, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# Serve HTML pages
@app.get("/", response_class=FileResponse)
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/auth", response_class=FileResponse)
async def serve_auth():
    return FileResponse(os.path.join(FRONTEND_DIR, "auth.html"))


@app.get("/feed", response_class=FileResponse)
async def serve_feed():
    return FileResponse(os.path.join(FRONTEND_DIR, "feed.html"))


@app.get("/box/{box_id}", response_class=FileResponse)
async def serve_box_detail(box_id: int):
    return FileResponse(os.path.join(FRONTEND_DIR, "box-detail.html"))


@app.get("/my-orders", response_class=FileResponse)
async def serve_my_orders():
    return FileResponse(os.path.join(FRONTEND_DIR, "my-orders.html"))


@app.get("/merchant/dashboard", response_class=FileResponse)
async def serve_merchant_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "merchant", "dashboard.html"))


@app.get("/admin/dashboard", response_class=FileResponse)
async def serve_admin_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin", "dashboard.html"))
