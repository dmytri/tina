> STOP. Captain's notes: non-binding. Captain writes, Captain trims. Anyone else: close this file now.

# Captain Notes

## Current state - 2026-07-22

**Product:** TINA (There Is No Alternative), a pre-execution tool-call interceptor.

**Phrase list:** `"try a different approach"`, `"try an alternative approach"`, `"try an alternate approach"`. Configurable via env var, .tina.json, or per-adapter settings.

**Architecture:** Monorepo (`packages/core`, `packages/pi`, `packages/opencode`). Open Plugin at `plugins/agent-tina/`.

**Current voyage:** Complete and ready for outbound. Target releases are OpenCode 0.3.2, Pi 0.3.3, and agent-tina 0.3.4.

**Adapter status:**
- Pi: scans message text and thinking with session-local latch state.
- OpenCode: scans assistant message parts with session-local latch state.
- Claude Code: parses JSONL transcripts and distinguishes human prompts from tool results.
- Cursor/Codex/Copilot: not supported because hook APIs lack transcript access.

**Shipshape:** Fitted. Production-backed adapter checks, plank checks, typecheck, lint, and the real Pi eval are green.

## Future concerns
- LLM classifier explicitly rejected by the user. Never propose it.
- Cursor/Codex/Copilot support blocked on their hook APIs exposing transcript
