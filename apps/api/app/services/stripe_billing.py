"""Stripe Billing / Checkout / PaymentIntents — stubs for Phase 1 wiring."""

from typing import Optional

import stripe

from app.config import get_settings


def _configure() -> None:
    settings = get_settings()
    if settings.stripe_secret_key:
        stripe.api_key = settings.stripe_secret_key


def create_navigator_checkout_session(*, customer_id: Optional[str], member_id: str, email: str) -> str:
    _configure()
    settings = get_settings()
    # Placeholder: replace with real Checkout Session create when keys are set
    if not settings.stripe_secret_key:
        return f"{settings.app_public_url}/membership?checkout=stub&member={member_id}"
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id or None,
        customer_email=None if customer_id else email,
        line_items=[{"price": settings.stripe_price_navigator_monthly, "quantity": 1}],
        success_url=f"{settings.app_public_url}/membership?success=1",
        cancel_url=f"{settings.app_public_url}/membership?canceled=1",
        metadata={"member_id": member_id, "tier": "navigator"},
    )
    return session.url or settings.app_public_url


def create_billing_portal_session(*, customer_id: str) -> str:
    _configure()
    settings = get_settings()
    if not settings.stripe_secret_key or not customer_id:
        return f"{settings.app_public_url}/membership?portal=stub"
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.app_public_url}/membership",
    )
    return session.url


def create_payment_intent(*, amount_cents: int, customer_id: Optional[str], metadata: dict) -> tuple[Optional[str], Optional[str]]:
    """Returns (payment_intent_id, client_secret). amount 0 → no PI."""
    if amount_cents <= 0:
        return None, None
    _configure()
    settings = get_settings()
    if not settings.stripe_secret_key:
        return "pi_stub", "pi_stub_secret"
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        customer=customer_id or None,
        metadata=metadata,
        automatic_payment_methods={"enabled": True},
    )
    return intent.id, intent.client_secret
