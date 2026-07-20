> STOP. Captain's notes: non-binding. Captain writes, Captain trims. Anyone else: close this file now.

# Captain Notes

## TINA v1 — 2026-07-20

**Product:** TINA (There Is No Alternative) — pre-execution tool-call interceptor.

**Mechanism:** Dumb phrase list matching against assistant-authored text. Latch on match, total tool block, reset on user message or `/tina reset`.

**Phrase list (v1, tight):** `"alternative approach"`, `"alternate approach"`, `"alternatively"`

**Harnesses:** Pi (tool_call hook), OpenCode (tool.execute.before hook). Shared core under `src/core/`, adapters under `src/pi/` and `src/opencode/`.

**Stack:** TypeScript, ESM, Node 20+, npm. Cucumber-js for Gherkin specs, biome for lint/format, c8 for coverage.

**Bootstrap complete.** Initial commit pending. Next: dispatch QM.

## Future concerns
- v2 may want phrase list extensibility (config file, env var)
- LLM classifier was explicitly rejected by the user — never propose it
