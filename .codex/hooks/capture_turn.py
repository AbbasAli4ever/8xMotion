#!/usr/bin/env python3
"""Append prompt/final-response pairs from Codex lifecycle hooks."""

from __future__ import annotations

import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import re
import sys


AUTHOR = "abbas"
TOOL = "codex"


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def safe_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "-", value)


def locate_log(log_dir: Path, session_id: str, timestamp: str) -> Path:
    matches = sorted(log_dir.glob(f"*_{safe_id(session_id)}.md"))
    if matches:
        return matches[0]
    stamp = timestamp[:19].replace("T", "_").replace(":", "-")
    return log_dir / f"{stamp}_{safe_id(session_id)}.md"


def initial_document(
    session_id: str, timestamp: str, model: str, project: str
) -> str:
    date = timestamp[:10]
    return (
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date}\n"
        f"author: {AUTHOR}\n"
        f"model: {model}\n"
        f"tool: {TOOL}\n"
        f"project: {project}\n"
        "total_exchanges: 0\n"
        f"first_prompt_time: {timestamp}\n"
        f"last_prompt_time: {timestamp}\n"
        "---\n\n"
        f"# Session Log - {date}\n\n"
        f"Session: `{session_id[:8]}` | Project: `{project}` | Author: `{AUTHOR}`\n\n"
        "---\n"
    )


def next_number(document: str, entry_type: str) -> int:
    numbers = [
        int(value)
        for value in re.findall(
            rf"^\[LOG_ENTRY type={entry_type} num=(\d+) ", document, re.MULTILINE
        )
    ]
    return max(numbers, default=0) + 1


def update_header(document: str, timestamp: str, model: str, count: int) -> str:
    document = re.sub(r"(?m)^model: .*?$", f"model: {model}", document, count=1)
    document = re.sub(
        r"(?m)^total_exchanges: \d+$", f"total_exchanges: {count}", document, count=1
    )
    return re.sub(
        r"(?m)^last_prompt_time: .*?$",
        f"last_prompt_time: {timestamp}",
        document,
        count=1,
    )


def main() -> int:
    event = json.load(sys.stdin)
    event_name = event.get("hook_event_name")
    if event_name not in {"UserPromptSubmit", "Stop"}:
        return 0

    content_key = "prompt" if event_name == "UserPromptSubmit" else "last_assistant_message"
    content = event.get(content_key)
    if content is None:
        return 0

    session_id = str(event.get("session_id") or "unknown-session")
    model = str(event.get("model") or "unknown-model")
    timestamp = utc_now()
    root = Path(event.get("cwd") or os.getcwd())
    log_dir = root / ".agent-logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    path = locate_log(log_dir, session_id, timestamp)

    lock_dir = root / ".git" if (root / ".git").is_dir() else log_dir
    lock_path = lock_dir / "agent-capture.lock"
    with lock_path.open("a", encoding="utf-8") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        document = (
            path.read_text(encoding="utf-8")
            if path.exists()
            else initial_document(session_id, timestamp, model, root.name)
        )
        entry_type = "PROMPT" if event_name == "UserPromptSubmit" else "RESPONSE"
        number = next_number(document, entry_type)
        entry = (
            f"\n\n[LOG_ENTRY type={entry_type} num={number} session={session_id[:8]}]\n"
            f"timestamp: {timestamp}\n"
            f"model: {model}\n\n"
            f"{content}\n"
        )
        if event_name == "UserPromptSubmit":
            document = update_header(document, timestamp, model, number)
        path.write_text(document + entry, encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"capture hook failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
