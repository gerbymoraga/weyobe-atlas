from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_member
from app.models import ExpeditionApplication, ExpeditionApplicationStatus, Member, MemberTier
from app.schemas import CheckoutUrlOut, ExpeditionApplicationOut, ExpeditionApplyIn, MembershipOut
from app.services import email as email_service
from app.services import stripe_billing

router = APIRouter(tags=["membership"])

NAVIGATOR_BENEFITS = [
    "Atlas Kit",
    "Event discounts + early booking",
    "Resource library + vendor discounts",
    "Monthly challenges & giveaways",
]

EXPEDITION_BENEFITS = [
    *NAVIGATOR_BENEFITS,
    "Free access to main events",
    "Private expeditions",
]


@router.get("/membership", response_model=MembershipOut)
async def membership(member: Annotated[Member, Depends(get_current_member)]) -> MembershipOut:
    benefits = EXPEDITION_BENEFITS if member.tier == MemberTier.expedition else NAVIGATOR_BENEFITS
    return MembershipOut(
        tier=member.tier.value,  # type: ignore[arg-type]
        status=member.status.value,  # type: ignore[arg-type]
        benefits=benefits,
        billing_summary={
            "stripe_customer_id": member.stripe_customer_id,
            "interval": "year" if member.tier == MemberTier.expedition else "month",
        },
        savings_to_date_cents=0,
    )


@router.post("/billing/portal", response_model=CheckoutUrlOut)
async def billing_portal(member: Annotated[Member, Depends(get_current_member)]) -> CheckoutUrlOut:
    url = stripe_billing.create_billing_portal_session(customer_id=member.stripe_customer_id or "")
    return CheckoutUrlOut(url=url)


@router.post("/subscriptions", response_model=CheckoutUrlOut)
async def start_navigator_subscription(member: Annotated[Member, Depends(get_current_member)]) -> CheckoutUrlOut:
    url = stripe_billing.create_navigator_checkout_session(
        customer_id=member.stripe_customer_id,
        member_id=member.id,
        email=member.email,
    )
    return CheckoutUrlOut(url=url)


@router.post("/expedition/apply", response_model=ExpeditionApplicationOut)
async def apply_expedition(
    body: ExpeditionApplyIn,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExpeditionApplicationOut:
    app_row = ExpeditionApplication(
        member_id=member.id,
        motivation=body.motivation,
        experience_level=body.experience_level,
        interest=body.interest,
        status=ExpeditionApplicationStatus.pending,
    )
    db.add(app_row)
    await db.commit()
    await db.refresh(app_row)
    email_service.application_received(member.email)
    return ExpeditionApplicationOut.model_validate(app_row)
