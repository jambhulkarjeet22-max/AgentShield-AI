"""Convex Cloud Database Client for Agentra AI.

Provides real-time event and campaign synchronisation to Convex DB
without requiring local PostgreSQL installation or socket management.
All sync operations run in background worker threads (fire-and-forget)
with an active circuit breaker to guarantee zero latency overhead on
agent execution pipelines.
"""

import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
import httpx

from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("agentra.db.convex")


class ConvexSyncClient:
    """Synchronises simulation campaigns and audit telemetry to Convex Cloud Database."""

    CIRCUIT_COOLDOWN_SECONDS: float = 10.0

    def __init__(self, convex_url: Optional[str] = None):
        if convex_url is not None:
            raw_url = convex_url
        else:
            raw_url = (
                getattr(settings, "CONVEX_URL", None)
                or os.getenv("CONVEX_URL")
                or os.getenv("NEXT_PUBLIC_CONVEX_URL")
                or ""
            )
        self.convex_url = raw_url.rstrip("/")
        self._http_client: Optional[httpx.Client] = None
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="convex-sync")
        self._circuit_open_until: float = 0.0

    @property
    def is_configured(self) -> bool:
        return bool(self.convex_url)

    def _get_client(self) -> httpx.Client:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.Client(timeout=3.0)
        return self._http_client

    def mutation(self, path: str, args: Dict[str, Any]) -> Optional[Any]:
        """Invoke a Convex mutation via the Convex HTTP API synchronously."""
        if not self.is_configured:
            return None

        now = time.time()
        if now < self._circuit_open_until:
            return None

        target_url = f"{self.convex_url}/api/mutation"
        try:
            client = self._get_client()
            resp = client.post(
                target_url,
                json={"path": path, "args": args},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("value")
            else:
                logger.warning(
                    "Convex mutation '%s' returned HTTP %d: %s",
                    path,
                    resp.status_code,
                    resp.text[:200],
                )
                return None
        except Exception as exc:
            self._circuit_open_until = time.time() + self.CIRCUIT_COOLDOWN_SECONDS
            logger.debug("Convex sync skipped (circuit opened for 10s): %s", exc)
            return None

    def query(self, path: str, args: Dict[str, Any]) -> Optional[Any]:
        """Invoke a Convex query via the Convex HTTP API synchronously."""
        if not self.is_configured:
            return None

        now = time.time()
        if now < self._circuit_open_until:
            return None

        target_url = f"{self.convex_url}/api/query"
        try:
            client = self._get_client()
            resp = client.post(
                target_url,
                json={"path": path, "args": args},
            )
            if resp.status_code == 200:
                return resp.json().get("value")
            return None
        except Exception as exc:
            self._circuit_open_until = time.time() + self.CIRCUIT_COOLDOWN_SECONDS
            logger.debug("Convex query failed (circuit opened for 10s): %s", exc)
            return None

    def _async_mutation(self, path: str, args: Dict[str, Any]) -> None:
        """Helper to run a mutation in the background threadpool."""
        if not self.is_configured or time.time() < self._circuit_open_until:
            return
        try:
            self._executor.submit(self.mutation, path, args)
        except Exception as exc:
            logger.debug("Convex async dispatch failed: %s", exc)

    # Convenience non-blocking sync methods for Agentra entities
    def sync_campaign(self, campaign_data: Dict[str, Any]) -> None:
        """Sync campaign record to Convex campaigns table in background."""
        self._async_mutation("campaigns:save", campaign_data)

    def sync_audit_log(self, log_data: Dict[str, Any]) -> None:
        """Stream an audit log entry to Convex audit_logs table in background."""
        self._async_mutation("events:record", log_data)

    def sync_decision(self, decision_data: Dict[str, Any]) -> None:
        """Record a Guardian decision in Convex guardian_decisions table in background."""
        self._async_mutation("guardian:recordDecision", decision_data)


# Global singleton instance
convex_client = ConvexSyncClient()
