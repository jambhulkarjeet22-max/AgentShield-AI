"""API endpoints for the Mock File System."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from backend.app.security.actors import MockActor, get_current_actor
from backend.app.tools.filesystem.models import (
    FileContentResponse,
    FileCreateUpdateRequest,
    FileListResponse,
    VirtualFile,
)
from backend.app.tools.filesystem.service import mock_filesystem_service

router = APIRouter(prefix="/files", tags=["Mock Tool: Filesystem"])


@router.get(
    "",
    response_model=FileListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Simulated Files",
    description="List accessible simulated files filtered by classification permissions.",
)
async def list_files(
    folder: Optional[str] = Query(default=None, description="Optional folder prefix to filter"),
    actor: MockActor = Depends(get_current_actor),
) -> FileListResponse:
    return mock_filesystem_service.list_files(actor=actor, folder=folder)


@router.get(
    "/content",
    response_model=FileContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Read Simulated File Content",
    description="Read file contents by virtual path. Traversal attempts and unauthorized tiers are blocked.",
)
async def read_file_content(
    path: str = Query(..., description="Virtual path of the file (e.g. 'public/company_handbook.txt')"),
    actor: MockActor = Depends(get_current_actor),
) -> FileContentResponse:
    return mock_filesystem_service.read_file(actor=actor, raw_path=path)


@router.post(
    "",
    response_model=VirtualFile,
    status_code=status.HTTP_201_CREATED,
    summary="Create or Update File in Sandbox",
    description="Create or overwrite a file strictly inside the 'sandbox/' virtual directory.",
)
async def create_file(
    payload: FileCreateUpdateRequest,
    actor: MockActor = Depends(get_current_actor),
) -> VirtualFile:
    return mock_filesystem_service.create_or_update_file(actor=actor, request=payload)

