"""Pydantic schemas and models for the simulated Mock Browser."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class WebPageCategory(str, Enum):
    """Classification of simulated web pages."""

    TRUSTED_INTERNAL = "TRUSTED_INTERNAL"
    TRUSTED_EXTERNAL = "TRUSTED_EXTERNAL"
    UNTRUSTED_EXTERNAL = "UNTRUSTED_EXTERNAL"
    MALICIOUS_PHISHING = "MALICIOUS_PHISHING"
    MALICIOUS_INJECTION = "MALICIOUS_INJECTION"


class WebPage(BaseModel):
    """Represents a simulated inert web page."""

    page_id: str = Field(description="Unique simulated web page identifier")
    url: str = Field(description="Simulated target URL")
    title: str = Field(description="Page title")
    domain: str = Field(description="Domain name")
    category: WebPageCategory = Field(description="Page safety classification")
    is_malicious: bool = Field(default=False, description="Whether the page contains attack content")
    content: str = Field(description="Rendered text content (treated as inert data, scripts never run)")
    content_type: str = Field(default="text/plain; charset=utf-8", description="MIME type")
    last_rendered: str = Field(description="ISO-8601 UTC timestamp")


class OpenPageRequest(BaseModel):
    """Request to open a simulated web page by ID or simulated URL."""

    page_id: Optional[str] = Field(default=None, description="Simulated page ID (e.g. 'page-trusted-001')")
    url: Optional[str] = Field(default=None, description="Simulated URL (e.g. 'http://internal.company.local/wiki')")

    @model_validator(mode="after")
    def check_at_least_one_identifier(self) -> "OpenPageRequest":
        if not self.page_id and not self.url:
            raise ValueError("Either page_id or url must be provided")
        return self


class WebPageListResponse(BaseModel):
    """Response containing a list of available simulated web pages."""

    total: int = Field(description="Total count of simulated pages")
    pages: List[WebPage] = Field(description="List of simulated page summaries")

