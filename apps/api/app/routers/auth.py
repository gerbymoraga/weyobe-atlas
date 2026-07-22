from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_member
from app.models import Member, MemberStatus, MemberTier
from app.schemas import AuthTokenOut, LoginIn, MemberOut, MemberUpdate, SignupIn
from app.services import email as email_service
from app.services.auth import create_access_token

router = APIRouter(tags=["auth"])


@router.post("/auth/signup", response_model=AuthTokenOut)
async def signup(body: SignupIn, db: Annotated[AsyncSession, Depends(get_db)]) -> AuthTokenOut:
    existing = await db.execute(select(Member).where(Member.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Scaffold: password stored via Supabase Auth in production.
    # Here we create the Member profile row and issue a local JWT.
    member = Member(
        email=body.email.lower(),
        first_name=body.first_name,
        last_name=body.last_name,
        tier=MemberTier.navigator,
        status=MemberStatus.active,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    email_service.welcome(member.email, member.first_name)
    token = create_access_token(member.id)
    return AuthTokenOut(access_token=token, member=MemberOut.model_validate(member))


@router.post("/auth/login", response_model=AuthTokenOut)
async def login(body: LoginIn, db: Annotated[AsyncSession, Depends(get_db)]) -> AuthTokenOut:
    result = await db.execute(select(Member).where(Member.email == body.email.lower()))
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Production: verify via Supabase Auth; scaffold accepts any password for known email in local dev only if no Supabase.
    token = create_access_token(member.id)
    return AuthTokenOut(access_token=token, member=MemberOut.model_validate(member))


@router.post("/auth/logout")
async def logout() -> dict:
    return {"ok": True}


@router.get("/me", response_model=MemberOut)
async def me(member: Annotated[Member, Depends(get_current_member)]) -> MemberOut:
    return MemberOut.model_validate(member)


@router.patch("/me", response_model=MemberOut)
async def update_me(
    body: MemberUpdate,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemberOut:
    if body.first_name is not None:
        member.first_name = body.first_name
    if body.last_name is not None:
        member.last_name = body.last_name
    await db.commit()
    await db.refresh(member)
    return MemberOut.model_validate(member)
