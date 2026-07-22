"""Transactional email via Resend (Postmark-compatible swap later)."""

from typing import Optional

from app.config import get_settings


def send_email(*, to: str, subject: str, html: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        # Dev: no-op log
        print(f"[email:stub] to={to} subject={subject}")
        return

    import resend

    resend.api_key = settings.resend_api_key
    resend.Emails.send(
        {
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        }
    )


def welcome(to: str, first_name: str) -> None:
    send_email(to=to, subject="Welcome to ATLAS", html=f"<p>Welcome aboard, {first_name}.</p>")


def booking_confirmation(to: str, event_title: str) -> None:
    send_email(to=to, subject=f"Booking confirmed — {event_title}", html=f"<p>You're booked for {event_title}.</p>")


def kit_status(to: str, status: str, tracking: Optional[str] = None) -> None:
    extra = f" Tracking: {tracking}" if tracking else ""
    send_email(to=to, subject=f"Your Atlas Kit — {status}", html=f"<p>Kit status: {status}.{extra}</p>")


def payment_failed(to: str) -> None:
    send_email(to=to, subject="ATLAS payment failed", html="<p>We couldn't process your latest payment.</p>")


def application_received(to: str) -> None:
    send_email(to=to, subject="Expedition application received", html="<p>We received your application.</p>")


def application_decision(to: str, approved: bool) -> None:
    subject = "Expedition application approved" if approved else "Expedition application update"
    send_email(to=to, subject=subject, html=f"<p>Decision: {'approved' if approved else 'declined'}.</p>")
