"""Application configuration module using pydantic-settings."""

from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AgentShield AI application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Core Application Settings
    APP_NAME: str = Field(default="AgentShield-AI", description="Application name")
    APP_VERSION: str = Field(default="0.1.0", description="Application version")
    APP_ENV: str = Field(default="development", description="Environment: development, test, production")
    DEBUG: bool = Field(default=False, description="Debug mode flag")
    API_V1_PREFIX: str = Field(default="/api/v1", description="Prefix for API v1 routes")

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            return v.strip().lower() in ("true", "1", "yes", "on", "t", "debug")
        return bool(v)

    # Network & Server
    HOST: str = Field(default="127.0.0.1", description="Server host binding")
    PORT: int = Field(default=8000, description="Server port")
    # Database & Storage (Convex Cloud Database & SQLite/PostgreSQL)
    CONVEX_URL: Optional[str] = Field(default=None, description="Convex Cloud deployment URL")
    DATABASE_URL: str = Field(
        default="sqlite:///./agentshield.db",
        description="Database connection URL (defaults to zero-config SQLite)",
    )
    POSTGRES_USER: Optional[str] = Field(default="agentshield", description="Optional PostgreSQL username")
    POSTGRES_PASSWORD: Optional[str] = Field(default=None, description="Optional PostgreSQL password")
    POSTGRES_HOST: Optional[str] = Field(default="localhost", description="Optional PostgreSQL host")
    POSTGRES_PORT: Optional[int] = Field(default=5432, description="Optional PostgreSQL port")
    POSTGRES_DB: Optional[str] = Field(default="agentshield_db", description="Optional PostgreSQL db name")
    DATABASE_POOL_SIZE: int = Field(default=10, description="SQLAlchemy connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, description="SQLAlchemy connection pool max overflow")
    DATABASE_ECHO: bool = Field(default=False, description="Log generated SQL statements")

    # Machine Learning & Prompt Injection Service Configuration
    MODEL_PATH: str = Field(
        default="ml-model/artifacts/prompt_injection_model.joblib",
        description="Path to ML model artifacts",
    )
    ML_SERVICE_ENABLED: bool = Field(
        default=True,
        description="Enable ML advisory integration with Blue Team Guardian",
    )
    ML_SERVICE_URL: str = Field(
        default="http://localhost:8001",
        description="URL for standalone ML prompt injection prediction microservice",
    )
    ML_SERVICE_TIMEOUT_SECONDS: float = Field(
        default=1.5,
        description="Fail-fast timeout in seconds for ML inference",
    )
    ML_PROBABILITY_THRESHOLD: float = Field(
        default=0.65,
        description="Operational probability threshold for ML prompt injection advisory",
    )
    ML_MARGIN_THRESHOLD: float = Field(
        default=0.55,
        description="Decision margin threshold for ML prompt injection advisory",
    )

    # LLM Provider Configuration (Phase 3)
    LLM_PROVIDER: str = Field(default="mock", description="LLM provider: 'mock' (offline deterministic) or 'openai'")
    LLM_MODEL: str = Field(default="mock-deterministic", description="Model name for provider")
    LLM_API_KEY: Optional[str] = Field(default=None, description="API key for external LLM provider")
    LLM_BASE_URL: Optional[str] = Field(default=None, description="Base URL for external LLM provider")

    # Langfuse Observability & Agent Tracing
    LANGFUSE_SECRET_KEY: Optional[str] = Field(default=None, description="Langfuse secret key")
    LANGFUSE_PUBLIC_KEY: Optional[str] = Field(default=None, description="Langfuse public key")
    LANGFUSE_HOST: str = Field(default="https://cloud.langfuse.com", description="Langfuse server host")
    LANGFUSE_BASE_URL: Optional[str] = Field(default=None, description="Alternative Langfuse base URL")
    LANGFUSE_ENABLED: bool = Field(default=True, description="Enable Langfuse observability tracing")

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL")
    LOG_FORMAT: str = Field(
        default="json",
        description="Log format: json or text",
    )

    # CORS Settings (safe localhost defaults for local development)
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        description="Allowed CORS origins",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def is_production(self) -> bool:
        """Return True if running in production."""
        return self.APP_ENV.lower() in ("production", "prod")

    @property
    def is_development(self) -> bool:
        """Return True if running in development."""
        return self.APP_ENV.lower() in ("development", "dev")

    @property
    def is_testing(self) -> bool:
        """Return True if running tests."""
        return self.APP_ENV.lower() in ("test", "testing")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()

