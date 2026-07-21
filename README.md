# TINA — There Is No Alternative

Pre-execution tool-call interceptor. Scans assistant text for disallowed phrases ("try a different approach", "try an alternative approach", "try an alternate approach") and blocks subsequent tool calls when a match is detected.

## Setup

Copy and paste this to your coding agent:

```text
Install TINA by reading SETUP.md in the repo at https://github.com/dmytri/tina
and following the instructions for my agent type.
```

## Installation

### Pi

```bash
pi install npm:@dk/pi-tina
```

### OpenCode

Add to `opencode.json`:

```json
{
  "plugin": ["@dk/opencode-tina"]
}
```

### Claude Code / Cursor / Codex / Copilot

```bash
npx plugins add dmytri/tina
```

Discovers and installs the `agent-tina` plugin into any detected agent tools on your machine. Registers a marketplace for auto-updates.

For development:

```bash
npx plugins add ./plugins/agent-tina
```

## Packages

| Package | Registry | Channel |
|---|---|---|
| `@dk/tina-core` | npm | Shared scan/latch logic |
| `@dk/pi-tina` | npm | Pi extension |
| `@dk/opencode-tina` | npm | OpenCode plugin |
| `plugins/agent-tina/` | GitHub | Open Plugin (Claude, Cursor, Codex, Copilot) |
