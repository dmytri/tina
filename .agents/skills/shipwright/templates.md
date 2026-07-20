# Shipwright templates

Scaffold material for fitting out, used by the Fitting out procedure in `SKILL.md` beside this file. The Rigging shape rules live in `SKILL.md`; the Rigging read contract lives in the `shipshape` skill. When this file is absent, derive each artifact from those rules directly.

## RIGGING.md template

Create `RIGGING.md` at project root. Fill in the derived values. Keep it to values, not procedure.

````markdown
# Rigging

Project tooling values for Shipshape roles. Values only, not procedure.
Procedure lives in the skills. Every role reads this on open.

## Stack

- language: <derived>
- runtime: <derived or none>
- packageManager: <derived or none>

## Directories

- implementation: <every directory that can hold a planked seam, one path per line, key repeated; `*` matches one path segment>
- specs: <one path per line>
- verification: <narrowest directories holding verification support, never a parent of the specs directory, one path per line, or none>
- assets: <one path per line, or none>
- scantlings: <machine-readable contract files in place, one path per line, or none>

## Commands

- discover: `<derived or none>`
- focused: `<derived command with {scenario}>`
- broad: `<derived enumeration sweep, without stop-on-first-failure, or none>`
- coverage: `<derived or none>`
- step-usage: `<derived or none>`
- plank-inventory: `<derived or none>`
- typecheck: `<derived or none>`
- lint: `<derived or none>`
- conformance: `<derived scantling check, or none>`

## Perturbation

- message: `PERTURBATION: consider current durable context; remove when fixed`
- perturb: `<host-language perturbation statement using the message>`

## Tiers

- default: <derived or @logic>
- sandbox: <derived or none>
- policy: <tier tag and its credentials or provisioning policy, one line per tier>
- weather: <wake path for the weather record, or none>
- runrecord: <git-ignored wake path for the voyage run record, or none>

## Dependencies

- policy: <derived or locked>
- dependency: <one line per selected or installed name; none only where nothing is installed>

## Outbound

- outbound: <target name, or none>
- ship: `<derived command>`
- verify: `<derived live-artifact check>`
````

For JavaScript and TypeScript, derive this perturbation value:

```markdown
- perturb: `throw new Error("PERTURBATION: consider current durable context; remove when fixed");`
```

For other languages, use the normal throwing statement for that language. If the value is not clear, raise a Captain blocker.

## AGENTS.md template

Create `AGENTS.md` at project root. If `AGENTS.md` already exists, append the Shipshape block and never remove existing content.

````markdown
# Agent Instructions

This project uses Shipshape, a context-isolated spec-driven workflow for coding agents.

Agent opening this project: ensure Shipshape is installed, then load the `shipshape` skill (`shipshape:shipshape` under the plugin channel) and follow its routing before other work. Decide how to involve the human per your configured preferences.

Tooling values such as stack, directories, and commands live in `RIGGING.md`.

Install with the open skills CLI, which works across most agent runtimes:

```bash
npx skills add dmytri/shipshape --skill '*'
```

If your runtime supports the open-plugin format, such as Claude Code or Cursor, install the experimental plugin build instead:

```bash
npx plugins add dmytri/shipshape
```

Update Shipshape at a voyage boundary with `npx skills update` for the skills install, or re-run `npx plugins add dmytri/shipshape` for the plugin build.
````

## README.md block

Append this block to the project README, never overwriting existing content:

````markdown
## Built with Shipshape

This repository uses [Shipshape](https://github.com/dmytri/shipshape), a context-isolated spec-driven workflow for coding agents. Install with `npx skills add dmytri/shipshape --skill '*'`, or the experimental open-plugin build with `npx plugins add dmytri/shipshape`.
````
