"""Thread-safe in-memory task execution state store for the Target Agent."""

import threading
from typing import Dict, List, Optional
from backend.app.agents.target.schemas import TaskResponse


class TaskStateStore:
    """Stores execution state and history for Target Agent tasks."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tasks: Dict[str, TaskResponse] = {}

    def save_task(self, task: TaskResponse) -> TaskResponse:
        with self._lock:
            self._tasks[task.task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[TaskResponse]:
        with self._lock:
            return self._tasks.get(task_id)

    def list_tasks(
        self,
        actor_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TaskResponse]:
        with self._lock:
            items = list(self._tasks.values())

        if actor_id:
            items = [t for t in items if t.actor_id.lower() == actor_id.lower()]

        # Return newest tasks first
        sorted_items = sorted(items, key=lambda x: x.created_at, reverse=True)
        return sorted_items[offset : offset + limit]

    def count(self) -> int:
        with self._lock:
            return len(self._tasks)

    def reset(self) -> None:
        with self._lock:
            self._tasks.clear()


task_state_store = TaskStateStore()

