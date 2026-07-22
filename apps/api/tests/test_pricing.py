"""Placeholder tests — expand with bookability / pricing unit tests for Phase 1."""

from app.models import Event, Member, MemberTier
from app.services.pricing import compute_booking_amount, resolve_bookability
from datetime import date, datetime, timezone


def test_expedition_only_locked_for_navigator():
    event = Event(
        title="Private",
        location="X",
        description="",
        starts_on=date.today(),
        ends_on=date.today(),
        member_price=0,
        regular_price=50000,
        expedition_only=True,
        capacity=10,
        seats_taken=0,
        member_open_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        public_open_at=datetime(2020, 1, 15, tzinfo=timezone.utc),
    )
    member = Member(email="a@b.com", first_name="A", last_name="B", tier=MemberTier.navigator)
    bookable, reason = resolve_bookability(event, member)
    assert bookable is False
    assert reason == "upgrade_required"


def test_expedition_comp_is_zero():
    event = Event(
        title="Main",
        location="X",
        description="",
        starts_on=date.today(),
        ends_on=date.today(),
        member_price=25000,
        regular_price=40000,
        expedition_only=False,
        capacity=10,
        seats_taken=0,
        member_open_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        public_open_at=datetime(2020, 1, 15, tzinfo=timezone.utc),
    )
    member = Member(email="a@b.com", first_name="A", last_name="B", tier=MemberTier.expedition)
    assert compute_booking_amount(event=event, member=member, attendee_count=2, addon_prices=[1000]) == 0
