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

### Claude Code

```bash
claude plugin install agent-tina@claude-community
```

Once accepted into the community marketplace. Or sideload directly:

```bash
claude --plugin-dir ./plugins/agent-tina
```

### Cursor / Codex / Copilot

Install the `agent-tina` plugin from the `@dk/tina` marketplace. This repo hosts an Open Plugins–compatible plugin directory at `plugins/agent-tina/` with a `PreToolUse` hook.

```bash
git clone https://github.com/dmytri/tina
cursor --plugin-dir ./plugins/agent-tina
```

## Packages

| Package | Registry | Channel |
|---|---|---|
| `@dk/tina-core` | npm | Shared scan/latch logic |
| `@dk/pi-tina` | npm | Pi extension |
| `@dk/opencode-tina` | npm | OpenCode plugin |
| `plugins/agent-tina/` | GitHub | Open Plugin (Claude, Cursor, Codex, Copilot) |
