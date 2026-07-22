"""Server-side event bookability + pricing. Never trust client prices."""

from datetime import datetime, timezone

from app.models import Event, Member, MemberTier
from app.schemas import BookableReason


def resolve_bookability(event: Event, member: Member | None, now: datetime | None = None) -> tuple[bool, BookableReason]:
    now = now or datetime.now(timezone.utc)

    if member is None:
        return False, "not_member"

    if event.seats_taken >= event.capacity > 0:
        return False, "sold_out"

    if event.expedition_only and member.tier != MemberTier.expedition:
        return False, "upgrade_required"

    if now < event.member_open_at:
        return False, "opens_later"

    # Early window: members can book from member_open_at; public_open_at is informational for now
    if now >= event.member_open_at:
        return True, "open"

    return False, "opens_later"


def compute_booking_amount(
    *,
    event: Event,
    member: Member,
    attendee_count: int,
    addon_prices: list[int],
) -> int:
    """Return amount in cents. Expedition comps on expedition_only (and main events) = 0."""
    if member.tier == MemberTier.expedition:
        # Spec: Expedition members get free access to main events + private expeditions
        return 0

    base = event.member_price * attendee_count
    return base + sum(addon_prices)
