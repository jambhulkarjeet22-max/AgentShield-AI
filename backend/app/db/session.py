"""Database session factory, connection pooling, and lifecycle management.

Supports:
- Convex Cloud Database (serverless real-time reactive sync)
- Zero-config SQLite (default local persistence)
- PostgreSQL (optional enterprise relational storage)
"""

from typing import Generator, Optional, Tuple
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.db.convex_client import convex_client

logger = get_logger("agentshield.db.session")

_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker[Session]] = None


def create_db_engine(db_url: Optional[str] = None) -> Engine:
    """Create a configured SQLAlchemy Engine with automated fallback to SQLite."""
    url = db_url or settings.DATABASE_URL

    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.DATABASE_ECHO,
        )

        # Enforce foreign key constraints in SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return engine

    # PostgreSQL configuration with resilient SQLite fallback
    try:
        engine = create_engine(
            url,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            pool_pre_ping=True,
            echo=settings.DATABASE_ECHO,
        )
        return engine
    except Exception as exc:
        logger.warning(
            "Could not initialize PostgreSQL engine (%s). Falling back to zero-config SQLite.",
            exc,
        )
        return create_db_engine("sqlite:///./agentshield.db")


def get_engine() -> Engine:
    """Return the global SQLAlchemy Engine instance."""
    global _engine
    if _engine is None:
        _engine = create_db_engine()
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the global Session factory."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return _session_factory


def set_engine_override(engine: Optional[Engine]) -> None:
    """Override the active engine and session factory (primarily for test suites)."""
    global _engine, _session_factory
    _engine = engine
    if engine is not None:
        _session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    else:
        _session_factory = None


def reset_db_engine() -> None:
    """Dispose and clear cached engine so new configuration is picked up."""
    global _engine, _session_factory
    if _engine is not None:
        try:
            _engine.dispose()
        except Exception:
            pass
    _engine = None
    _session_factory = None


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding an isolated database session with automatic commit/rollback."""
    factory = get_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.error("Database session transaction rolled back due to error: %s", exc)
        raise
    finally:
        session.close()


def check_db_connection() -> Tuple[bool, str]:
    """Probe the configured database (Convex Cloud or local engine) to verify live connectivity."""
    # 1. If Convex Cloud DB is configured, test Convex connectivity
    if convex_client.is_configured:
        try:
            res = convex_client.query("campaigns:getLatest", {})
            if res is not None:
                return True, "Convex Cloud Database connected and operational."
        except Exception as exc:
            logger.warning("Convex connectivity probe failed: %s", exc)

    # 2. Test local SQLite / relational database engine
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database engine verified and operational."
    except Exception as exc:
        logger.warning("Database connection probe failed: %s", exc)
        return False, str(exc)
