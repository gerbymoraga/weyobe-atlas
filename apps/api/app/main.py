from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.routers import admin, auth, core, events, kit, library, membership, webhooks

# Ensure models are registered on Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Scaffold: create tables on startup. Switch to Alembic migrations before pilot.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ATLAS Member API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(membership.router)
    app.include_router(events.router)
    app.include_router(kit.router)
    app.include_router(library.router)
    app.include_router(core.router)
    app.include_router(admin.router)
    app.include_router(webhooks.router)

    @app.get("/")
    async def root() -> RedirectResponse:
        return RedirectResponse(url="/api")

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
