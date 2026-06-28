import hmac

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.security import create_admin_token
from app.schemas import AdminLoginRequest, AdminTokenRead

router = APIRouter(tags=["auth"])


@router.post("/admin/login", response_model=AdminTokenRead)
async def admin_login(
    payload: AdminLoginRequest,
    settings: Settings = Depends(get_settings),
) -> AdminTokenRead:
    valid_username = hmac.compare_digest(payload.username, settings.admin_username)
    valid_password = hmac.compare_digest(payload.password, settings.admin_password)
    if not valid_username or not valid_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    token, expires_at = create_admin_token(settings)
    return AdminTokenRead(access_token=token, expires_at=expires_at)
