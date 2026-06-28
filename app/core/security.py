import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.core.config import Settings


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_admin_token(settings: Settings) -> tuple[str, int]:
    expires_at = int(time.time()) + settings.admin_token_expire_minutes * 60
    payload = {"sub": settings.admin_username, "exp": expires_at}
    body = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _sign(body, settings)
    return f"{body}.{signature}", expires_at


def verify_admin_token(token: str, settings: Settings) -> bool:
    try:
        body, signature = token.split(".", 1)
    except ValueError:
        return False

    expected_signature = _sign(body, settings)
    if not hmac.compare_digest(signature, expected_signature):
        return False

    try:
        payload: dict[str, Any] = json.loads(_base64url_decode(body))
    except (ValueError, json.JSONDecodeError):
        return False

    return payload.get("sub") == settings.admin_username and int(payload.get("exp", 0)) >= int(time.time())


def _sign(body: str, settings: Settings) -> str:
    digest = hmac.new(settings.admin_signing_secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return _base64url_encode(digest)
