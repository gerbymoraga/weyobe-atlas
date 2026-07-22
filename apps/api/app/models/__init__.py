from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MemberTier(str, Enum):
    navigator = "navigator"
    expedition = "expedition"


class MemberStatus(str, Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"


class SubscriptionInterval(str, Enum):
    month = "month"
    year = "year"


class BookingStatus(str, Enum):
    confirmed = "confirmed"
    canceled = "canceled"


class KitShipmentStatus(str, Enum):
    ordered = "ordered"
    packed = "packed"
    shipped = "shipped"
    delivered = "delivered"


class ExpeditionApplicationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"


class Member(Base):
    __tablename__ = "members"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    tier: Mapped[MemberTier] = mapped_column(SAEnum(MemberTier, name="member_tier"), nullable=False, default=MemberTier.navigator)
    status: Mapped[MemberStatus] = mapped_column(SAEnum(MemberStatus, name="member_status"), nullable=False, default=MemberStatus.active)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    member_since: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="member")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="member")
    kit_shipments: Mapped[list["KitShipment"]] = relationship(back_populates="member")
    core_checkins: Mapped[list["CoreCheckin"]] = relationship(back_populates="member")
    expedition_applications: Mapped[list["ExpeditionApplication"]] = relationship(back_populates="member")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("members.id"), nullable=False, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tier: Mapped[MemberTier] = mapped_column(SAEnum(MemberTier, name="subscription_tier", create_constraint=False), nullable=False)
    interval: Mapped[SubscriptionInterval] = mapped_column(SAEnum(SubscriptionInterval, name="subscription_interval"), nullable=False)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member: Mapped["Member"] = relationship(back_populates="subscriptions")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    member_price: Mapped[int] = mapped_column(Integer, nullable=False)  # cents
    regular_price: Mapped[int] = mapped_column(Integer, nullable=False)  # cents
    expedition_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    family_friendly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    seats_taken: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    member_open_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    public_open_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    addons: Mapped[list["EventAddon"]] = relationship(back_populates="event")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="event")


class EventAddon(Base):
    __tablename__ = "event_addons"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # cents; 0 = free-today
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event: Mapped["Event"] = relationship(back_populates="addons")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("members.id"), nullable=False, index=True)
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), nullable=False, index=True)
    attendee_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    addon_ids: Mapped[list[str]] = mapped_column(ARRAY(UUID(as_uuid=False)), nullable=False, default=list)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # cents; 0 for Expedition comps
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus, name="booking_status"), nullable=False, default=BookingStatus.confirmed)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member: Mapped["Member"] = relationship(back_populates="bookings")
    event: Mapped["Event"] = relationship(back_populates="bookings")


class KitShipment(Base):
    __tablename__ = "kit_shipments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("members.id"), nullable=False, index=True)
    status: Mapped[KitShipmentStatus] = mapped_column(
        SAEnum(KitShipmentStatus, name="kit_shipment_status"),
        nullable=False,
        default=KitShipmentStatus.ordered,
    )
    carrier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    est_delivery: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member: Mapped["Member"] = relationship(back_populates="kit_shipments")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False, index=True)
    rating: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    discount_label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    discount_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CoreCheckin(Base):
    __tablename__ = "core_checkins"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("members.id"), nullable=False, index=True)
    profession: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    health: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    relationships: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    adventure: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    checked_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member: Mapped["Member"] = relationship(back_populates="core_checkins")


class ExpeditionApplication(Base):
    __tablename__ = "expedition_applications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("members.id"), nullable=False, index=True)
    motivation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    experience_level: Mapped[str] = mapped_column(String, nullable=False, default="")
    interest: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[ExpeditionApplicationStatus] = mapped_column(
        SAEnum(ExpeditionApplicationStatus, name="expedition_application_status"),
        nullable=False,
        default=ExpeditionApplicationStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    member: Mapped["Member"] = relationship(back_populates="expedition_applications")
