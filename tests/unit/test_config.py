"""Unit tests for configuration management."""

from backend.app.core.config import Settings, get_settings


def test_default_settings():
    """Verify default settings load cleanly with safe defaults."""
    settings = get_settings()
    assert settings.APP_NAME == "AgentShield-AI"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.PORT == 8000
    assert settings.HOST == "127.0.0.1"


def test_cors_origins_parsing():
    """Verify CORS origins string is parsed into list."""
    custom_settings = Settings(CORS_ORIGINS="http://localhost:3000,http://example.com")
    assert "http://localhost:3000" in custom_settings.CORS_ORIGINS
    assert "http://example.com" in custom_settings.CORS_ORIGINS

