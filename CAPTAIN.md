> STOP. Captain's notes: non-binding. Captain writes, Captain trims. Anyone else: close this file now.

# Captain Notes

## Current state — 2026-07-22

**Product:** TINA (There Is No Alternative) — pre-execution tool-call interceptor.

**Phrase list:** `"try a different approach"`, `"try an alternative approach"`, `"try an alternate approach"`. Configurable via env var, .tina.json, or per-adapter settings.

**Architecture:** Monorepo (`packages/core`, `packages/pi`, `packages/opencode`). Open Plugin at `plugins/agent-tina/`.

**Adapter status:**
- Pi: working — scans message text + thinking via Pi extension API. Persistent latch.
- OpenCode: working — scans message parts via generic `event` hook. Latch resets on user message.
- Claude Code: working — parses JSONL transcript, scans from last user turn.
- Cursor/Codex/Copilot: not supported — hook APIs lack transcript access.

**Shipshape:** Fitted. All seams planked. 15 scenarios (12 @logic, 3 conformance skeletons). Marketed as `@dk/pi-tina`, `@dk/opencode-tina`, `@dk/tina-core` on npm.

## Future concerns
- LLM classifier explicitly rejected by the user — never propose it
- Cursor/Codex/Copilot support blocked on their hook APIs exposing transcript
