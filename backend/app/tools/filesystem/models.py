"""Pydantic schemas and models for the simulated Mock File System."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class FileSensitivity(str, Enum):
    """Data classification levels for simulated files."""

    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class VirtualFile(BaseModel):
    """Metadata representation of a simulated file."""

    path: str = Field(description="Normalized virtual sandbox path (e.g. 'public/handbook.txt')")
    name: str = Field(description="File name")
    sensitivity: FileSensitivity = Field(description="Access classification tier")
    size_bytes: int = Field(description="File content size in bytes")
    created_at: str = Field(description="ISO-8601 creation timestamp")
    modified_at: str = Field(description="ISO-8601 last modified timestamp")
    is_sandbox: bool = Field(default=False, description="Whether the file resides in the writable sandbox")
    content: Optional[str] = Field(default=None, description="Inert file content (omitted in directory listings)")


class FileCreateUpdateRequest(BaseModel):
    """Request payload to write or overwrite a file in the sandbox."""

    path: str = Field(
        min_length=1,
        max_length=255,
        description="Target virtual path within the sandbox (e.g. 'sandbox/output.txt')",
    )
    content: str = Field(
        max_length=500000,
        description="File contents to write (treated as inert text)",
    )

    @field_validator("path")
    @classmethod
    def validate_path_format(cls, v: str) -> str:
        clean = v.strip().replace("\\", "/")
        if not clean:
            raise ValueError("File path cannot be empty")
        return clean


class FileListResponse(BaseModel):
    """Response containing a list of accessible simulated files."""

    total: int = Field(description="Total count of accessible files")
    files: List[VirtualFile] = Field(description="List of virtual file metadata")


class FileContentResponse(BaseModel):
    """Response for reading a file's content."""

    path: str = Field(description="Virtual path")
    sensitivity: FileSensitivity = Field(description="File sensitivity classification")
    size_bytes: int = Field(description="File size in bytes")
    modified_at: str = Field(description="Last modified timestamp")
    content: str = Field(description="Inert text content of the file")

