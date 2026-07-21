# TINA Setup

This plugin intercepts tool calls and blocks them when it detects disallowed phrases in assistant-generated text.

## Default phrases

- "try a different approach"
- "try an alternative approach"
- "try an alternate approach"

## Per-agent setup

### Pi

```bash
pi install npm:@dk/pi-tina
```

**Configure phrases:** add a `tina.phrases` key to your Pi settings:

```json
// ~/.pi/agent/settings.json  (global)
// .pi/settings.json          (project)
{
  "tina": {
    "phrases": ["try a different approach", "try an alternative approach"]
  }
}
```

### OpenCode

Add to `opencode.json`:

```json
{
  "plugin": ["@dk/opencode-tina"]
}
```

**Configure phrases:** set the `TINA_PHRASES` environment variable:

```json
// ~/.bashrc, opencode.json "env", or launch prefix
TINA_PHRASES='["try a different approach","try an alternative approach"]'
```

### Claude Code

Once accepted into the community marketplace:

```bash
claude plugin install agent-tina@claude-community
```

Or sideload:

```bash
claude --plugin-dir ./plugins/agent-tina
```

**Configure phrases:** create a `.tina.json` in your project root:

```json
{
  "phrases": ["try a different approach", "try an alternative approach"]
}
```

Or set `TINA_PHRASES` environment variable.

### Cursor / Codex / Copilot

```bash
git clone https://github.com/dmytri/tina
cursor --plugin-dir ./plugins/agent-tina
```

**Configure phrases:** same as Claude Code — `.tina.json` or `TINA_PHRASES`.

## Verification

After installation, prompt the assistant to suggest "try a different approach". The tool call should be blocked and the session should latch.
