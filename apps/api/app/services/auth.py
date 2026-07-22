"""Auth helpers.

Production: verify Supabase JWTs (SUPABASE_JWT_SECRET) and sync Member rows.
Scaffold: lightweight local JWT for structure / early local testing.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import get_settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(member_id: str) -> str:
    settings = get_settings()
    secret = settings.supabase_jwt_secret or "dev-insecure-secret-change-me"
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": member_id, "exp": expire}, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    settings = get_settings()
    secret = settings.supabase_jwt_secret or "dev-insecure-secret-change-me"
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except JWTError:
        return None
