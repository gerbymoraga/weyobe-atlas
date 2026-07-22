from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_member
from app.models import KitShipment, Member
from app.schemas import KitShipmentOut

router = APIRouter(tags=["kit"])

# Pilot placeholder until final SKU list is confirmed with Mike
DEFAULT_KIT_CONTENTS = [
    "Welcome letter",
    "ATLAS field notebook",
    "Member patch",
    "Surprise gear item",
]


@router.get("/kit", response_model=KitShipmentOut | None)
async def get_kit(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> KitShipmentOut | None:
    result = await db.execute(
        select(KitShipment)
        .where(KitShipment.member_id == member.id)
        .order_by(KitShipment.created_at.desc())
        .limit(1)
    )
    shipment = result.scalar_one_or_none()
    if shipment is None:
        return None
    out = KitShipmentOut.model_validate(shipment)
    out.contents = DEFAULT_KIT_CONTENTS
    return out
