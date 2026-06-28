from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class MediaAssetRead(BaseModel):
    id: int
    filename: str
    content_type: str
    alt_text: str
    url: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminTokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int


class PageSectionRead(BaseModel):
    id: int
    key: str
    title_fr: str
    title_en: str
    subtitle_fr: str
    subtitle_en: str
    kind: str
    content: dict[str, Any]
    sort_order: int
    published: bool
    media: MediaAssetRead | None = None
    updated_at: datetime


class PageSectionUpdate(BaseModel):
    title_fr: str
    title_en: str
    subtitle_fr: str = ""
    subtitle_en: str = ""
    kind: str = "content"
    content: dict[str, Any] = Field(default_factory=dict)
    sort_order: int = 0
    published: bool = True
    media_id: int | None = None


class PageSectionCreate(PageSectionUpdate):
    key: str


class MediaAssetUpdate(BaseModel):
    filename: str | None = None
    alt_text: str = ""


class ContactMessageCreate(BaseModel):
    full_name: str
    email: EmailStr
    subject: str
    message: str


class ContactMessageRead(ContactMessageCreate):
    id: int
    created_at: datetime
