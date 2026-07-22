from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.services import email as email_service

router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    stripe_signature: Annotated[str | None, Header(alias="Stripe-Signature")] = None,
) -> dict:
    """Handle checkout.session.completed, subscription updated/deleted, invoice.payment_failed."""
    settings = get_settings()
    payload = await request.body()
    _ = (db, stripe_signature, payload, settings)
    # Scaffold: verify signature with stripe.Webhook.construct_event when secret is set
    # Then sync members.status + subscriptions from Stripe events.
    return {"received": True}


@router.post("/webhooks/stripe/test-payment-failed")
async def test_payment_failed(email: str) -> dict:
    """Dev-only helper — remove before production."""
    if get_settings().stripe_webhook_secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    email_service.payment_failed(email)
    return {"ok": True}
