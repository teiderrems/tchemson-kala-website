from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.models import ContactMessage
from app.db.session import get_session
from app.schemas import ContactMessageCreate, ContactMessageRead

router = APIRouter(tags=["messages"])


@router.post("/messages", response_model=ContactMessageRead)
async def create_message(
    payload: ContactMessageCreate,
    session: AsyncSession = Depends(get_session),
) -> ContactMessageRead:
    message = ContactMessage(**payload.model_dump())
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return ContactMessageRead.model_validate(message, from_attributes=True)


@router.get("/admin/messages", response_model=list[ContactMessageRead], dependencies=[Depends(require_admin)])
async def list_messages(session: AsyncSession = Depends(get_session)) -> list[ContactMessageRead]:
    result = await session.execute(select(ContactMessage).order_by(ContactMessage.created_at.desc()))
    return [ContactMessageRead.model_validate(item, from_attributes=True) for item in result.scalars()]


@router.delete("/admin/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_message(message_id: int, session: AsyncSession = Depends(get_session)) -> None:
    message = await session.get(ContactMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    await session.delete(message)
    await session.commit()
