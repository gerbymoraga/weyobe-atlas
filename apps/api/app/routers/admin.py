"""Internal admin routes — role-gated for pilot (not a full admin app)."""

from datetime import date
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import require_admin
from app.models import (
    ExpeditionApplication,
    ExpeditionApplicationStatus,
    KitShipment,
    KitShipmentStatus,
    Member,
    MemberTier,
)
from app.services import email as email_service
from app.services import stripe_billing

router = APIRouter(prefix="/admin", tags=["admin"])


class KitUpdateIn(BaseModel):
    status: Literal["ordered", "packed", "shipped", "delivered"]
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    est_delivery: Optional[date] = None


class ApplicationDecisionIn(BaseModel):
    status: Literal["approved", "declined"]


@router.patch("/kit/{shipment_id}")
async def update_kit(
    shipment_id: str,
    body: KitUpdateIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(KitShipment).where(KitShipment.id == shipment_id))
    shipment = result.scalar_one_or_none()
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    shipment.status = KitShipmentStatus(body.status)
    if body.carrier is not None:
        shipment.carrier = body.carrier
    if body.tracking_number is not None:
        shipment.tracking_number = body.tracking_number
    if body.est_delivery is not None:
        shipment.est_delivery = body.est_delivery

    member = await db.get(Member, shipment.member_id)
    await db.commit()
    if member:
        email_service.kit_status(member.email, body.status, body.tracking_number)
    return {"ok": True}


@router.post("/expedition-applications/{application_id}/decide")
async def decide_application(
    application_id: str,
    body: ApplicationDecisionIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(ExpeditionApplication).where(ExpeditionApplication.id == application_id))
    app_row = result.scalar_one_or_none()
    if app_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    app_row.status = ExpeditionApplicationStatus(body.status)
    member = await db.get(Member, app_row.member_id)
    checkout_url = None

    if body.status == "approved" and member:
        member.tier = MemberTier.expedition
        # Annual charge only after approval — Checkout URL for ops/member
        checkout_url = stripe_billing.create_navigator_checkout_session(
            customer_id=member.stripe_customer_id,
            member_id=member.id,
            email=member.email,
        )
        # TODO: use STRIPE_PRICE_EXPEDITION_ANNUAL specifically

    await db.commit()
    if member:
        email_service.application_decision(member.email, approved=body.status == "approved")

    return {"ok": True, "checkout_url": checkout_url}
