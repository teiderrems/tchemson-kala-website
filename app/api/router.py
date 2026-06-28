from fastapi import APIRouter

from app.api.routes import auth, media, messages, sections

router = APIRouter(prefix="/api")
router.include_router(auth.router)
router.include_router(sections.router)
router.include_router(media.router)
router.include_router(messages.router)
