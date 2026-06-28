from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.api.mappers import section_to_read
from app.db.models import MediaAsset, PageSection
from app.db.session import get_session
from app.schemas import PageSectionCreate, PageSectionRead, PageSectionUpdate

router = APIRouter(tags=["sections"])


@router.get("/sections", response_model=list[PageSectionRead])
async def list_sections(session: AsyncSession = Depends(get_session)) -> list[PageSectionRead]:
    result = await session.execute(
        select(PageSection)
        .where(PageSection.published.is_(True))
        .options(selectinload(PageSection.media))
        .order_by(PageSection.sort_order)
    )
    return [section_to_read(section) for section in result.scalars()]


@router.get("/admin/sections", response_model=list[PageSectionRead], dependencies=[Depends(require_admin)])
async def admin_list_sections(session: AsyncSession = Depends(get_session)) -> list[PageSectionRead]:
    result = await session.execute(
        select(PageSection).options(selectinload(PageSection.media)).order_by(PageSection.sort_order)
    )
    return [section_to_read(section) for section in result.scalars()]


async def get_section_read_model(section_id: int, session: AsyncSession) -> PageSectionRead:
    result = await session.execute(
        select(PageSection).where(PageSection.id == section_id).options(selectinload(PageSection.media))
    )
    section = result.scalar_one()
    return section_to_read(section)


@router.post(
    "/admin/sections",
    response_model=PageSectionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_section(
    payload: PageSectionCreate,
    session: AsyncSession = Depends(get_session),
) -> PageSectionRead:
    existing = await session.scalar(select(PageSection.id).where(PageSection.key == payload.key))
    if existing:
        raise HTTPException(status_code=409, detail="Section key already exists")

    if payload.media_id is not None:
        media = await session.get(MediaAsset, payload.media_id)
        if not media:
            raise HTTPException(status_code=400, detail="Media not found")

    section = PageSection(**payload.model_dump())
    session.add(section)
    await session.commit()
    return await get_section_read_model(section.id, session)


@router.put("/admin/sections/{section_id}", response_model=PageSectionRead, dependencies=[Depends(require_admin)])
async def update_section(
    section_id: int,
    payload: PageSectionUpdate,
    session: AsyncSession = Depends(get_session),
) -> PageSectionRead:
    section = await session.get(PageSection, section_id, options=[selectinload(PageSection.media)])
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if payload.media_id is not None:
        media = await session.get(MediaAsset, payload.media_id)
        if not media:
            raise HTTPException(status_code=400, detail="Media not found")

    for field, value in payload.model_dump().items():
        setattr(section, field, value)

    await session.commit()
    return await get_section_read_model(section.id, session)


@router.delete("/admin/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_section(
    section_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    section = await session.get(PageSection, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    await session.delete(section)
    await session.commit()
