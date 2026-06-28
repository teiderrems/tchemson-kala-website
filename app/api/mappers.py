from app.db.models import MediaAsset, PageSection
from app.schemas import MediaAssetRead, PageSectionRead


def media_to_read(media: MediaAsset) -> MediaAssetRead:
    return MediaAssetRead(
        id=media.id,
        filename=media.filename,
        content_type=media.content_type,
        alt_text=media.alt_text,
        url=f"/api/media/{media.id}/bytes",
    )


def section_to_read(section: PageSection) -> PageSectionRead:
    return PageSectionRead(
        id=section.id,
        key=section.key,
        title_fr=section.title_fr,
        title_en=section.title_en,
        subtitle_fr=section.subtitle_fr,
        subtitle_en=section.subtitle_en,
        kind=section.kind,
        content=section.content,
        sort_order=section.sort_order,
        published=section.published,
        media=media_to_read(section.media) if section.media else None,
        updated_at=section.updated_at,
    )
