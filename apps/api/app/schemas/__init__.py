from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


Tier = Literal["navigator", "expedition"]
MemberStatus = Literal["active", "past_due", "canceled"]
BookableReason = Literal[
    "open",
    "opens_later",
    "upgrade_required",
    "sold_out",
    "not_member",
]


class MemberOut(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    tier: Tier
    status: MemberStatus
    member_since: Optional[date] = None
    is_admin: bool = False

    model_config = {"from_attributes": True}


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    member: MemberOut


class EventAddonOut(BaseModel):
    id: str
    name: str
    price: int

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
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
    bookable: bool
    bookable_reason: BookableReason
    addons: list[EventAddonOut] = []

    model_config = {"from_attributes": True}


class BookEventIn(BaseModel):
    attendee_count: int = Field(ge=1, default=1)
    addon_ids: list[str] = []


class BookingOut(BaseModel):
    id: str
    member_id: str
    event_id: str
    attendee_count: int
    addon_ids: list[str]
    amount_paid: int
    status: Literal["confirmed", "canceled"]
    stripe_payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None

    model_config = {"from_attributes": True}


class KitShipmentOut(BaseModel):
    id: str
    status: Literal["ordered", "packed", "shipped", "delivered"]
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    est_delivery: Optional[date] = None
    contents: list[str] = []

    model_config = {"from_attributes": True}


class ResourceOut(BaseModel):
    id: str
    name: str
    category: str
    rating: Optional[float] = None
    discount_label: Optional[str] = None

    model_config = {"from_attributes": True}


class CoreCheckinIn(BaseModel):
    profession: int = Field(ge=0, le=100)
    health: int = Field(ge=0, le=100)
    relationships: int = Field(ge=0, le=100)
    adventure: int = Field(ge=0, le=100)


class CoreCheckinOut(BaseModel):
    id: str
    profession: int
    health: int
    relationships: int
    adventure: int
    checked_in_at: datetime

    model_config = {"from_attributes": True}


class ExpeditionApplyIn(BaseModel):
    motivation: str
    experience_level: str
    interest: str


class ExpeditionApplicationOut(BaseModel):
    id: str
    status: Literal["pending", "approved", "declined"]
    motivation: str
    experience_level: str
    interest: str

    model_config = {"from_attributes": True}


class MembershipOut(BaseModel):
    tier: Tier
    status: MemberStatus
    benefits: list[str]
    billing_summary: dict
    savings_to_date_cents: int = 0


class CheckoutUrlOut(BaseModel):
    url: str
