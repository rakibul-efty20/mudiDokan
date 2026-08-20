from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db_models import User, UserRole

# NOTE: using bcrypt directly rather than passlib — passlib's bcrypt backend
# is broken against bcrypt>=4.1 (a known upstream incompatibility: passlib
# reads a `__about__.__version__` attribute bcrypt no longer has).

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/{settings.api_version}/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error from None

    # Role is always read fresh from the DB, never trusted from an old token,
    # so a role change from an admin takes effect immediately rather than
    # waiting for the token to expire.
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_error
    return user


def require_role(*allowed_roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return dependency


def get_optional_user(
    token: str = Depends(OAuth2PasswordBearer(tokenUrl=f"/api/{settings.api_version}/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> User | None:
    """For endpoints usable by both guests and logged-in users (checkout).
    Returns None rather than raising when there's no/invalid token — an
    invalid token on a guest checkout shouldn't block the purchase."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        return db.get(User, int(user_id)) if user_id else None
    except JWTError:
        return None
