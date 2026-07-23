from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_member
from app.models import Member, Resource
from app.schemas import ResourceOut

router = APIRouter(tags=["library"])


@router.get("/resources", response_model=list[ResourceOut])
async def list_resources(
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ResourceOut]:
    _ = member  # member-gated
    result = await db.execute(select(Resource).order_by(Resource.name))
    return [ResourceOut.model_validate(r) for r in result.scalars().all()]


@router.get("/resources/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: str,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ResourceOut:
    _ = member
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return ResourceOut.model_validate(resource)


@router.get("/resources/{resource_id}/redirect")
async def redirect_resource(
    resource_id: str,
    member: Annotated[Member, Depends(get_current_member)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RedirectResponse:
    _ = member
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if resource is None or not resource.discount_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    # TODO: log click analytics
    return RedirectResponse(url=resource.discount_url)
