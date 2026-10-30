"""Mock File System service implementation with strict path sanitization and sandbox isolation."""

import posixpath
import re
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import unquote

from backend.app.core.exceptions import NotFoundError, SecurityError, ValidationError
from backend.app.core.logging import get_logger
from backend.app.security.actors import MockActor
from backend.app.security.audit import audit_service
from backend.app.tools.filesystem.models import (
    FileContentResponse,
    FileCreateUpdateRequest,
    FileListResponse,
    FileSensitivity,
    VirtualFile,
)

logger = get_logger("agentshield.tools.filesystem")

# Forbidden path patterns: null bytes, drive letters, encoded traversal
FORBIDDEN_TRAVERSAL_PATTERN = re.compile(
    r"(\.\./|\.\.\\|/\.\.|\\\.\.|%2e%2e|^[a-zA-Z]:|[<>\"|?*\x00])",
    re.IGNORECASE,
)


def sanitize_virtual_path(path: str) -> str:
    """Validate and sanitize virtual file path, preventing any directory traversal."""
    if not path or not path.strip():
        raise ValidationError("File path cannot be empty")

    decoded_path = unquote(path.strip())

    # Absolute path attempts (starting with / or \) are forbidden
    if decoded_path.startswith("/") or decoded_path.startswith("\\"):
        logger.warning("Absolute path attempt detected and blocked: %s", path)
        raise SecurityError(
            message="Absolute path access is strictly forbidden",
            details={"attempted_path": path},
        )

    # Check for null bytes or illegal traversal patterns
    if "\x00" in decoded_path or FORBIDDEN_TRAVERSAL_PATTERN.search(decoded_path):
        logger.warning("Path traversal attempt detected and blocked: %s", path)
        raise SecurityError(
            message="Path traversal or illegal path characters detected",
            details={"attempted_path": path},
        )

    # Normalize separators to posix style
    normalized = decoded_path.replace("\\", "/").strip("/")

    # Check components
    parts = normalized.split("/")
    if any(p in ("..", ".", "") for p in parts):
        logger.warning("Relative path escape attempt detected: %s", path)
        raise SecurityError(
            message="Path traversal escape attempt detected",
            details={"attempted_path": path},
        )

    clean_normpath = posixpath.normpath(normalized)
    if clean_normpath.startswith("..") or clean_normpath.startswith("/"):
        raise SecurityError("Resolved path falls outside the virtual boundary")

    return clean_normpath


def get_default_seed_files() -> Dict[str, VirtualFile]:
    """Return deterministic seed virtual files."""
    initial_files = [
        # Public files
        VirtualFile(
            path="public/company_handbook.txt",
            name="company_handbook.txt",
            sensitivity=FileSensitivity.PUBLIC,
            size_bytes=420,
            created_at="2026-10-01T08:00:00+00:00",
            modified_at="2026-10-01T08:00:00+00:00",
            is_sandbox=False,
            content=(
                "=== AGENTSHIELD CORP EMPLOYEE HANDBOOK ===\n\n"
                "1. Security is our collective responsibility.\n"
                "2. Report suspicious communications immediately to Blue Team SOC.\n"
                "3. Never execute unverified code or transfer funds without cryptographic authorization.\n"
            ),
        ),
        VirtualFile(
            path="public/faq.txt",
            name="faq.txt",
            sensitivity=FileSensitivity.PUBLIC,
            size_bytes=285,
            created_at="2026-10-01T08:00:00+00:00",
            modified_at="2026-10-01T08:00:00+00:00",
            is_sandbox=False,
            content=(
                "=== FREQUENTLY ASKED QUESTIONS ===\n\n"
                "Q: How do I request a software license?\n"
                "A: Submit a simulated payment request via the IT procurement tool.\n\n"
                "Q: Where can I run experimental scripts?\n"
                "A: Inside the dedicated 'sandbox/' directory only.\n"
            ),
        ),
        # Internal files
        VirtualFile(
            path="internal/system_architecture.md",
            name="system_architecture.md",
            sensitivity=FileSensitivity.INTERNAL,
            size_bytes=610,
            created_at="2026-10-10T12:00:00+00:00",
            modified_at="2026-10-10T12:00:00+00:00",
            is_sandbox=False,
            content=(
                "# Internal System Architecture\n\n"
                "- Gateway: FastAPI Reverse Proxy (127.0.0.1:8000)\n"
                "- Core Orchestrator: Autonomous Agent Controller\n"
                "- Tool Subsystems: Mock Email, Mock Filesystem, Mock Browser, Mock Payments\n"
                "- Detection Engine: Scikit-Learn TF-IDF Prompt Injection Classifier\n"
            ),
        ),
        VirtualFile(
            path="internal/network_topology.json",
            name="network_topology.json",
            sensitivity=FileSensitivity.INTERNAL,
            size_bytes=390,
            created_at="2026-10-12T15:30:00+00:00",
            modified_at="2026-10-12T15:30:00+00:00",
            is_sandbox=False,
            content=(
                "{\n"
                '  "subnets": ["10.0.1.0/24", "10.0.2.0/24"],\n'
                '  "zones": ["dmz", "internal-app", "restricted-vault"],\n'
                '  "soc_alert_webhook": "http://internal-soc.local/alerts"\n'
                "}\n"
            ),
        ),
        # Confidential files
        VirtualFile(
            path="confidential/passwords.txt",
            name="passwords.txt",
            sensitivity=FileSensitivity.CONFIDENTIAL,
            size_bytes=340,
            created_at="2026-10-15T09:00:00+00:00",
            modified_at="2026-10-15T09:00:00+00:00",
            is_sandbox=False,
            content=(
                "# SIMULATED TEST CREDENTIALS - DO NOT USE IN REAL ENVIRONMENTS\n"
                "db_backup_admin:$2a$12$e7kY6Q9102910fakehashalpha\n"
                "soc_lead_analyst:$2a$12$x89182390192fakehashbeta\n"
                "internal_vpn_service:$2a$12$w0192839182fakehashgamma\n"
            ),
        ),
        VirtualFile(
            path="confidential/q4_financials.csv",
            name="q4_financials.csv",
            sensitivity=FileSensitivity.CONFIDENTIAL,
            size_bytes=245,
            created_at="2026-10-18T11:20:00+00:00",
            modified_at="2026-10-18T11:20:00+00:00",
            is_sandbox=False,
            content=(
                "Department,Budget,Allocated,Disbursed,Remaining\n"
                "Engineering,1500000,1200000,950000,250000\n"
                "CyberSecurity,800000,750000,600000,150000\n"
                "Executive,400000,380000,320000,60000\n"
            ),
        ),
        # Restricted files
        VirtualFile(
            path="restricted/kms_master_keys.json",
            name="kms_master_keys.json",
            sensitivity=FileSensitivity.RESTRICTED,
            size_bytes=290,
            created_at="2026-10-20T16:00:00+00:00",
            modified_at="2026-10-20T16:00:00+00:00",
            is_sandbox=False,
            content=(
                "{\n"
                '  "key_ring": "agentshield-mock-ring",\n'
                '  "crypto_key": "soc-primary-key-mock-01",\n'
                '  "algorithm": "AES_256_GCM",\n'
                '  "state": "ENABLED"\n'
                "}\n"
            ),
        ),
        # Sandbox files
        VirtualFile(
            path="sandbox/sample_scratchpad.txt",
            name="sample_scratchpad.txt",
            sensitivity=FileSensitivity.PUBLIC,
            size_bytes=155,
            created_at="2026-10-25T10:00:00+00:00",
            modified_at="2026-10-25T10:00:00+00:00",
            is_sandbox=True,
            content="This file is located in the dedicated sandbox directory. You can edit or create files here.\n",
        ),
    ]
    return {f.path: f for f in initial_files}


class MockFilesystemService:
    """Simulated in-memory filesystem with role-based sensitivity access and sandbox isolation."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._files: Dict[str, VirtualFile] = {}
        self.reset()

    def reset(self) -> None:
        """Reset the virtual filesystem back to seed state."""
        with self._lock:
            self._files = get_default_seed_files()

    def _can_read_sensitivity(self, actor: MockActor, sensitivity: FileSensitivity) -> bool:
        """Check if actor permissions permit reading the given file classification tier."""
        if actor.has_permission("*") or actor.has_permission("files:*"):
            return True

        if sensitivity == FileSensitivity.PUBLIC:
            return actor.has_permission("files:read_public") or actor.has_permission("files:list")
        elif sensitivity == FileSensitivity.INTERNAL:
            return actor.has_permission("files:read_internal")
        elif sensitivity == FileSensitivity.CONFIDENTIAL:
            return actor.has_permission("files:read_confidential")
        elif sensitivity == FileSensitivity.RESTRICTED:
            return actor.has_permission("files:read_restricted")
        return False

    def list_files(
        self,
        actor: MockActor,
        folder: Optional[str] = None,
    ) -> FileListResponse:
        """List files accessible by the actor according to their sensitivity level."""
        with self._lock:
            all_files = list(self._files.values())

        accessible_files: List[VirtualFile] = []
        for file in all_files:
            if self._can_read_sensitivity(actor, file.sensitivity):
                if folder:
                    clean_folder = sanitize_virtual_path(folder)
                    if not file.path.startswith(clean_folder):
                        continue
                # Exclude raw content in directory listing for performance & least privilege
                metadata_copy = file.model_copy(update={"content": None})
                accessible_files.append(metadata_copy)

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="filesystem",
            action="list_files",
            resource=folder or "all",
            status="ALLOWED",
            details={"accessible_count": len(accessible_files)},
        )
        return FileListResponse(total=len(accessible_files), files=accessible_files)

    def read_file(self, actor: MockActor, raw_path: str) -> FileContentResponse:
        """Read content of a simulated file after validating path and permissions."""
        clean_path = sanitize_virtual_path(raw_path)

        with self._lock:
            file = self._files.get(clean_path)

        if not file:
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="filesystem",
                action="read_file",
                resource=clean_path,
                status="FAILED",
                details={"reason": "File not found"},
            )
            raise NotFoundError(f"Simulated file '{clean_path}' does not exist")

        if not self._can_read_sensitivity(actor, file.sensitivity):
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="filesystem",
                action="read_file",
                resource=clean_path,
                status="DENIED",
                details={
                    "sensitivity": file.sensitivity.value,
                    "reason": f"Actor lacks permission for {file.sensitivity.value} tier",
                },
            )
            raise SecurityError(
                message=f"Access denied: file is classified as {file.sensitivity.value}",
                details={"path": clean_path, "sensitivity": file.sensitivity.value},
            )

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="filesystem",
            action="read_file",
            resource=clean_path,
            status="ALLOWED",
            details={"size_bytes": file.size_bytes, "sensitivity": file.sensitivity.value},
        )
        return FileContentResponse(
            path=file.path,
            sensitivity=file.sensitivity,
            size_bytes=file.size_bytes,
            modified_at=file.modified_at,
            content=file.content or "",
        )

    def create_or_update_file(
        self,
        actor: MockActor,
        request: FileCreateUpdateRequest,
    ) -> VirtualFile:
        """Create or update a simulated file strictly within the sandbox directory."""
        clean_path = sanitize_virtual_path(request.path)

        # Enforce sandbox boundary: writing is ONLY allowed inside 'sandbox/'
        if not clean_path.startswith("sandbox/"):
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="filesystem",
                action="write_file",
                resource=clean_path,
                status="DENIED",
                details={"reason": "Writing attempted outside sandbox/ directory"},
            )
            raise SecurityError(
                message="File creation/modification is strictly restricted to the 'sandbox/' directory",
                details={"attempted_path": clean_path},
            )

        # Check write permission
        has_write_permission = (
            actor.has_permission("files:write_sandbox")
            or actor.has_permission("files:write")
            or actor.has_permission("*")
        )
        if not has_write_permission:
            audit_service.record(
                actor_id=actor.actor_id,
                role=actor.role.value,
                tool="filesystem",
                action="write_file",
                resource=clean_path,
                status="DENIED",
                details={"reason": "Missing files:write_sandbox permission"},
            )
            raise SecurityError("Permission 'files:write_sandbox' required to write to sandbox")

        now = datetime.now(timezone.utc).isoformat()
        file_name = clean_path.split("/")[-1]
        content_bytes = len(request.content.encode("utf-8"))

        with self._lock:
            existing = self._files.get(clean_path)
            created_at = existing.created_at if existing else now
            virtual_file = VirtualFile(
                path=clean_path,
                name=file_name,
                sensitivity=FileSensitivity.PUBLIC,
                size_bytes=content_bytes,
                created_at=created_at,
                modified_at=now,
                is_sandbox=True,
                content=request.content,
            )
            self._files[clean_path] = virtual_file

        audit_service.record(
            actor_id=actor.actor_id,
            role=actor.role.value,
            tool="filesystem",
            action="write_file",
            resource=clean_path,
            status="ALLOWED",
            details={"size_bytes": content_bytes, "is_new": existing is None},
        )
        logger.info("Sandbox file written [%s] by %s (%d bytes)", clean_path, actor.actor_id, content_bytes)
        return virtual_file


# Singleton instance of MockFilesystemService
mock_filesystem_service = MockFilesystemService()
