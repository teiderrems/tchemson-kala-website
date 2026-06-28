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

    used_by_section = await session.scalar(select(PageSection.id).where(PageSection.media_id == media_id).limit(1))
    if used_by_section:
        raise HTTPException(status_code=409, detail="Media is still used by a section")

    await session.delete(media)
    await session.commit()


@router.get("/media/{media_id}/bytes")
async def get_media_bytes(media_id: int, session: AsyncSession = Depends(get_session)) -> Response:
    media = await session.get(MediaAsset, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return Response(media.bytes_data, media_type=media.content_type)
