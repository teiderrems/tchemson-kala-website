from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .api.router import router as api_router
from .core.config import get_settings
from .db.models import Base
from .db.session import AsyncSessionLocal, engine
from .services.seed import seed_defaults


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_defaults(session)
    yield


app = FastAPI(title="Tchemson-Kala API", lifespan=lifespan)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

frontend_dist = Path(__file__).resolve().parents[1] / "dist"
frontend_router = APIRouter()

if hasattr(frontend_router, "frontend"):
    frontend_router.frontend("/", directory=str(frontend_dist), fallback="index.html", check_dir=False)


else:
    @frontend_router.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        requested_file = frontend_dist / full_path
        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)

        index = frontend_dist / "index.html"
        if index.exists():
            return FileResponse(index)
        return {"message": "Angular frontend is not built yet. Run `npm run build` in frontend/."}


app.include_router(frontend_router)
