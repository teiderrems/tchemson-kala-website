from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.api.mappers import media_to_read
from app.db.models import MediaAsset, PageSection
from app.db.session import get_session
from app.schemas import MediaAssetRead, MediaAssetUpdate

router = APIRouter(tags=["media"])


def content_references_media(value: object, media_id: int) -> bool:
    media_url = f"/api/media/{media_id}/bytes"
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"mediaId", "photoMediaId"} and item == media_id:
                return True
            if content_references_media(item, media_id):
                return True
        return False

    if isinstance(value, list):
        return any(content_references_media(item, media_id) for item in value)

    return value == media_url


def remove_media_references(value: object, media_id: int) -> tuple[object, bool]:
    media_url = f"/api/media/{media_id}/bytes"

    if isinstance(value, list):
        changed = False
        cleaned_items: list[object] = []
        for item in value:
            if isinstance(item, dict) and (item.get("mediaId") == media_id or item.get("url") == media_url):
                changed = True
                continue

            cleaned_item, item_changed = remove_media_references(item, media_id)
            changed = changed or item_changed
            cleaned_items.append(cleaned_item)
        return cleaned_items, changed

    if isinstance(value, dict):
        changed = False
        cleaned = dict(value)

        if cleaned.get("photoMediaId") == media_id or cleaned.get("photoUrl") == media_url:
            cleaned["photoMediaId"] = None
            cleaned["photoUrl"] = ""
            cleaned["photoAlt"] = ""
            changed = True

        for prefix in ("backgroundImage", "appBackgroundImage"):
            url_key = f"{prefix}Url"
            if cleaned.get(url_key) == media_url:
                for key in (url_key, f"{prefix}Alt"):
                    cleaned.pop(key, None)
                changed = True

        for key, item in list(cleaned.items()):
            cleaned_item, item_changed = remove_media_references(item, media_id)
            if item_changed:
                cleaned[key] = cleaned_item
                changed = True

        return cleaned, changed

    return value, False


@router.get("/admin/media", response_model=list[MediaAssetRead], dependencies=[Depends(require_admin)])
async def list_media(session: AsyncSession = Depends(get_session)) -> list[MediaAssetRead]:
    result = await session.execute(select(MediaAsset).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc()))
    return [media_to_read(media) for media in result.scalars()]


@router.post("/admin/media", response_model=MediaAssetRead, dependencies=[Depends(require_admin)])
async def upload_media(
    file: UploadFile = File(...),
    alt_text: str = Form(""),
    session: AsyncSession = Depends(get_session),
) -> MediaAssetRead:
    media = MediaAsset(
        filename=file.filename or "upload.bin",
        content_type=file.content_type or "application/octet-stream",
        bytes_data=await file.read(),
        alt_text=alt_text,
    )
    session.add(media)
    await session.commit()
    await session.refresh(media)
    return media_to_read(media)


@router.patch("/admin/media/{media_id}", response_model=MediaAssetRead, dependencies=[Depends(require_admin)])
async def update_media(
    media_id: int,
    payload: MediaAssetUpdate,
    session: AsyncSession = Depends(get_session),
) -> MediaAssetRead:
    media = await session.get(MediaAsset, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if payload.filename is not None:
        media.filename = payload.filename
    media.alt_text = payload.alt_text

    await session.commit()
    await session.refresh(media)
    return media_to_read(media)


@router.delete("/admin/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_media(media_id: int, session: AsyncSession = Depends(get_session)) -> None:
    media = await session.get(MediaAsset, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    sections_result = await session.execute(select(PageSection))
    for section in sections_result.scalars():
        if section.media_id == media_id:
            section.media_id = None

        cleaned_content, changed = remove_media_references(section.content, media_id)
        if changed:
            section.content = cleaned_content

    await session.delete(media)
    await session.commit()


@router.get("/media/{media_id}/bytes")
async def get_media_bytes(media_id: int, session: AsyncSession = Depends(get_session)) -> Response:
    media = await session.get(MediaAsset, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return Response(media.bytes_data, media_type=media.content_type)
