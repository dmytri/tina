# TINA — There Is No Alternative

Pre-execution tool-call interceptor. Blocks tool calls when the assistant uses disallowed phrases ("try a different approach", "try an alternative approach", "try an alternate approach"). Once blocked, the session stays blocked until the user sends a new message or `/tina reset`.

| Adapter | Detects phrases in |
|---|---|
| Pi | assistant message text and thinking |
| OpenCode | assistant message text and reasoning |
| Claude Code | conversation transcript (JSONL) |
| Cursor / Codex / Copilot | requires transcript access — falls open when unavailable |

## Setup

Copy and paste this to your coding agent:

```text
Install TINA by reading SETUP.md in the repo at https://github.com/dmytri/tina
and following the instructions for my agent type.
```

## Installation

### Pi

Scans assistant message text and thinking blocks via Pi's message lifecycle events. Blocks all tool types on match. Latch persists across assistant retries.

```bash
pi install npm:@dk/pi-tina
```

### OpenCode

Scans assistant message text via OpenCode's message events. Blocks all tool types on match.

```json
{
  "plugin": ["@dk/opencode-tina"]
}
```

### Claude Code / Cursor / Codex / Copilot

Scans the conversation transcript via the Open Plugins `PreToolUse` hook. Returns a structured denial on match. Cursor, Codex, and Copilot will be supported once their hook APIs expose the conversation transcript.

```bash
npx plugins add dmytri/tina
```

For development:

```bash
npx plugins add ./plugins/agent-tina
```

## Packages

| Package | Registry | Channel |
|---|---|---|
| `@dk/tina-core` | npm | Phrase scanning logic |
| `@dk/pi-tina` | npm | Pi extension (scans assistant text) |
| `@dk/opencode-tina` | npm | OpenCode plugin (scans assistant text) |
| `plugins/agent-tina/` | GitHub | Open Plugin (Claude Code: transcript scan, others: transcript not yet available) |
