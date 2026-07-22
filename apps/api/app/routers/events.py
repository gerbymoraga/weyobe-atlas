from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.deps import get_current_member
from app.models import Booking, BookingStatus, Event, EventAddon, Member
from app.schemas import BookEventIn, BookingOut, EventAddonOut, EventOut
from app.services import email as email_service
from app.services import stripe_billing
from app.services.pricing import compute_booking_amount, resolve_bookability

router = APIRouter(tags=["events"])


def _event_out(event: Event, member: Member) -> EventOut:
    bookable, reason = resolve_bookability(event, member)
    return EventOut(
        id=event.id,
        title=event.title,
        location=event.location,
        description=event.description,
        starts_on=event.starts_on,
        ends_on=event.ends_on,
        member_price=event.member_price,
        regular_price=event.regular_price,
        expedition_only=event.expedition_only,
        family_friendly=event.family_friendly,
        capacity=event.capacity,
        seats_taken=event.seats_taken,
        member_open_at=event.member_open_at,
        public_open_at=event.public_open_at,
        image_url=event.image_url,
        bookable=bookable,
        bookable_reason=reason,
        addons=[EventAddonOut.model_validate(a) for a in (event.addons or [])],
    )


@router.get("/events", response_model=list[EventOut])
async def list_events(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[EventOut]:
    result = await db.execute(select(Event).options(selectinload(Event.addons)).order_by(Event.starts_on))
    events = result.scalars().all()
    return [_event_out(e, member) for e in events]


@router.get("/events/{event_id}", response_model=EventOut)
async def get_event(
    event_id: str,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventOut:
    result = await db.execute(select(Event).options(selectinload(Event.addons)).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_out(event, member)


@router.post("/events/{event_id}/book", response_model=BookingOut)
async def book_event(
    event_id: str,
    body: BookEventIn,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingOut:
    result = await db.execute(select(Event).options(selectinload(Event.addons)).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    bookable, reason = resolve_bookability(event, member)
    if not bookable:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=reason)

    addon_map = {a.id: a for a in event.addons}
    selected: list[EventAddon] = []
    for aid in body.addon_ids:
        if aid not in addon_map:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid addon: {aid}")
        selected.append(addon_map[aid])

    amount = compute_booking_amount(
        event=event,
        member=member,
        attendee_count=body.attendee_count,
        addon_prices=[a.price for a in selected],
    )

    pi_id, client_secret = stripe_billing.create_payment_intent(
        amount_cents=amount,
        customer_id=member.stripe_customer_id,
        metadata={"member_id": member.id, "event_id": event.id},
    )

    booking = Booking(
        member_id=member.id,
        event_id=event.id,
        attendee_count=body.attendee_count,
        addon_ids=body.addon_ids,
        amount_paid=amount,
        status=BookingStatus.confirmed if amount == 0 else BookingStatus.confirmed,
        stripe_payment_intent_id=pi_id,
    )
    event.seats_taken += body.attendee_count
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    email_service.booking_confirmation(member.email, event.title)

    out = BookingOut.model_validate(booking)
    out.client_secret = client_secret
    return out


@router.get("/bookings", response_model=list[BookingOut])
async def list_bookings(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[BookingOut]:
    result = await db.execute(
        select(Booking).where(Booking.member_id == member.id).order_by(Booking.created_at.desc())
    )
    return [BookingOut.model_validate(b) for b in result.scalars().all()]
