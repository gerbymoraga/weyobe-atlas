"""Internal admin routes — role-gated via members.is_admin (Atlas Superadmin)."""

from datetime import date, datetime
from typing import Annotated, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.deps import require_admin
from app.models import (
    Booking,
    Event,
    EventAddon,
    ExpeditionApplication,
    ExpeditionApplicationStatus,
    KitShipment,
    KitShipmentStatus,
    Member,
    MemberTier,
    Resource,
)
from app.schemas import EventAddonOut, MemberOut
from app.services import email as email_service
from app.services import stripe_billing

router = APIRouter(prefix="/admin", tags=["admin"])


# ----- request / response models -----


class KitUpdateIn(BaseModel):
    status: Literal["ordered", "packed", "shipped", "delivered"]
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    est_delivery: Optional[date] = None


class ApplicationDecisionIn(BaseModel):
    status: Literal["approved", "declined"]


class AdminEventIn(BaseModel):
    title: str
    location: str = ""
    description: str = ""
    starts_on: date
    ends_on: date
    member_price: int = Field(ge=0)
    regular_price: int = Field(ge=0)
    expedition_only: bool = False
    family_friendly: bool = False
    capacity: int = Field(ge=0, default=0)
    member_open_at: datetime
    public_open_at: datetime
    image_url: Optional[str] = None


class AdminEventOut(BaseModel):
    id: str
    title: str
    location: str
    description: str
    starts_on: date
    ends_on: date
    member_price: int
    regular_price: int
    expedition_only: bool
    family_friendly: bool
    capacity: int
    seats_taken: int
    member_open_at: datetime
    public_open_at: datetime
    image_url: Optional[str] = None
    addons: list[EventAddonOut] = []

    model_config = {"from_attributes": True}


class AdminAddonIn(BaseModel):
    name: str
    price: int = Field(ge=0, default=0)


class AdminResourceIn(BaseModel):
    name: str
    category: str
    rating: Optional[float] = None
    discount_label: Optional[str] = None
    discount_url: Optional[str] = None


class AdminResourceOut(BaseModel):
    id: str
    name: str
    category: str
    rating: Optional[float] = None
    discount_label: Optional[str] = None
    discount_url: Optional[str] = None

    model_config = {"from_attributes": True}


class AdminKitOut(BaseModel):
    id: str
    member_id: str
    member_email: EmailStr
    member_name: str
    status: Literal["ordered", "packed", "shipped", "delivered"]
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    est_delivery: Optional[date] = None


class AdminApplicationOut(BaseModel):
    id: str
    member_id: str
    member_email: EmailStr
    member_name: str
    motivation: str
    experience_level: str
    interest: str
    status: Literal["pending", "approved", "declined"]
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminStatsOut(BaseModel):
    members: int
    events: int
    resources: int
    kit_shipments: int
    pending_applications: int
    bookings: int


def _event_out(event: Event) -> AdminEventOut:
    return AdminEventOut(
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
        addons=[EventAddonOut.model_validate(a) for a in (event.addons or [])],
    )


# ----- overview -----


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminStatsOut:
    async def count(model) -> int:
        result = await db.execute(select(func.count()).select_from(model))
        return int(result.scalar_one())

    pending = await db.execute(
        select(func.count())
        .select_from(ExpeditionApplication)
        .where(ExpeditionApplication.status == ExpeditionApplicationStatus.pending)
    )
    return AdminStatsOut(
        members=await count(Member),
        events=await count(Event),
        resources=await count(Resource),
        kit_shipments=await count(KitShipment),
        pending_applications=int(pending.scalar_one()),
        bookings=await count(Booking),
    )


@router.get("/members", response_model=list[MemberOut])
async def list_members(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MemberOut]:
    result = await db.execute(select(Member).order_by(Member.created_at.desc()))
    return [MemberOut.model_validate(m) for m in result.scalars().all()]


# ----- events (master) -----


@router.get("/events", response_model=list[AdminEventOut])
async def list_events(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AdminEventOut]:
    result = await db.execute(select(Event).options(selectinload(Event.addons)).order_by(Event.starts_on))
    return [_event_out(e) for e in result.scalars().all()]


@router.post("/events", response_model=AdminEventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: AdminEventIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminEventOut:
    event = Event(id=str(uuid4()), **body.model_dump())
    db.add(event)
    await db.commit()
    result = await db.execute(select(Event).options(selectinload(Event.addons)).where(Event.id == event.id))
    return _event_out(result.scalar_one())


@router.patch("/events/{event_id}", response_model=AdminEventOut)
async def update_event(
    event_id: str,
    body: AdminEventIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminEventOut:
    result = await db.execute(select(Event).options(selectinload(Event.addons)).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    for key, value in body.model_dump().items():
        setattr(event, key, value)
    await db.commit()
    result = await db.execute(select(Event).options(selectinload(Event.addons)).where(Event.id == event_id))
    return _event_out(result.scalar_one())


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    booked = await db.execute(select(func.count()).select_from(Booking).where(Booking.event_id == event_id))
    if int(booked.scalar_one()) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete event with existing bookings",
        )
    await db.delete(event)
    await db.commit()
    return {"ok": True}


@router.post("/events/{event_id}/addons", response_model=EventAddonOut, status_code=status.HTTP_201_CREATED)
async def create_addon(
    event_id: str,
    body: AdminAddonIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventAddonOut:
    event = await db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    addon = EventAddon(id=str(uuid4()), event_id=event_id, name=body.name, price=body.price)
    db.add(addon)
    await db.commit()
    await db.refresh(addon)
    return EventAddonOut.model_validate(addon)


@router.delete("/addons/{addon_id}")
async def delete_addon(
    addon_id: str,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    addon = await db.get(EventAddon, addon_id)
    if addon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Addon not found")
    await db.delete(addon)
    await db.commit()
    return {"ok": True}


# ----- resources (master) -----


@router.get("/resources", response_model=list[AdminResourceOut])
async def list_resources(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AdminResourceOut]:
    result = await db.execute(select(Resource).order_by(Resource.name))
    return [AdminResourceOut.model_validate(r) for r in result.scalars().all()]


@router.post("/resources", response_model=AdminResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    body: AdminResourceIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminResourceOut:
    resource = Resource(id=str(uuid4()), **body.model_dump())
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return AdminResourceOut.model_validate(resource)


@router.patch("/resources/{resource_id}", response_model=AdminResourceOut)
async def update_resource(
    resource_id: str,
    body: AdminResourceIn,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminResourceOut:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    for key, value in body.model_dump().items():
        setattr(resource, key, value)
    await db.commit()
    await db.refresh(resource)
    return AdminResourceOut.model_validate(resource)


@router.delete("/resources/{resource_id}")
async def delete_resource(
    resource_id: str,
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    await db.delete(resource)
    await db.commit()
    return {"ok": True}


# ----- kit ops -----


@router.get("/kit", response_model=list[AdminKitOut])
async def list_kits(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AdminKitOut]:
    result = await db.execute(select(KitShipment).order_by(KitShipment.created_at.desc()))
    shipments = result.scalars().all()
    out: list[AdminKitOut] = []
    for s in shipments:
        member = await db.get(Member, s.member_id)
        email = member.email if member else "unknown@invalid"
        name = f"{member.first_name} {member.last_name}".strip() if member else ""
        out.append(
            AdminKitOut(
                id=s.id,
                member_id=s.member_id,
                member_email=email,
                member_name=name,
                status=s.status.value,  # type: ignore[arg-type]
                carrier=s.carrier,
                tracking_number=s.tracking_number,
                est_delivery=s.est_delivery,
            )
        )
    return out


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


# ----- expedition applications -----


@router.get("/expedition-applications", response_model=list[AdminApplicationOut])
async def list_applications(
    _: Annotated[Member, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AdminApplicationOut]:
    result = await db.execute(
        select(ExpeditionApplication).order_by(ExpeditionApplication.created_at.desc())
    )
    rows = result.scalars().all()
    out: list[AdminApplicationOut] = []
    for app_row in rows:
        member = await db.get(Member, app_row.member_id)
        email = member.email if member else "unknown@invalid"
        name = f"{member.first_name} {member.last_name}".strip() if member else ""
        out.append(
            AdminApplicationOut(
                id=app_row.id,
                member_id=app_row.member_id,
                member_email=email,
                member_name=name,
                motivation=app_row.motivation,
                experience_level=app_row.experience_level,
                interest=app_row.interest,
                status=app_row.status.value,  # type: ignore[arg-type]
                created_at=app_row.created_at,
            )
        )
    return out


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
        checkout_url = stripe_billing.create_navigator_checkout_session(
            customer_id=member.stripe_customer_id,
            member_id=member.id,
            email=member.email,
        )

    await db.commit()
    if member:
        email_service.application_decision(member.email, approved=body.status == "approved")

    return {"ok": True, "checkout_url": checkout_url}
