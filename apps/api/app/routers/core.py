from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_member
from app.models import CoreCheckin, Member
from app.schemas import CoreCheckinIn, CoreCheckinOut

router = APIRouter(tags=["core"])


@router.get("/core/latest", response_model=CoreCheckinOut | None)
async def latest_checkin(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CoreCheckinOut | None:
    result = await db.execute(
        select(CoreCheckin)
        .where(CoreCheckin.member_id == member.id)
        .order_by(CoreCheckin.checked_in_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return CoreCheckinOut.model_validate(row) if row else None


@router.post("/core", response_model=CoreCheckinOut)
async def create_checkin(
    body: CoreCheckinIn,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CoreCheckinOut:
    row = CoreCheckin(
        member_id=member.id,
        profession=body.profession,
        health=body.health,
        relationships=body.relationships,
        adventure=body.adventure,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return CoreCheckinOut.model_validate(row)
