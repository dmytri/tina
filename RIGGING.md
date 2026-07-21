# Rigging

Project tooling values for Shipshape roles. Values only, not procedure.
Procedure lives in the skills. Every role reads this on open.

## Stack

- language: TypeScript
- runtime: node
- packageManager: npm (workspaces)

## Directories

- implementation: packages
- specs: features
- verification: features/step_definitions
- assets: assets
- scantlings: none

## Commands

- discover: `npx cucumber-js --dry-run --import tsx --import "features/step_definitions/**/*.ts" --tags "not @eval and not @captain and not @shipwright"`
- focused: `ref="{scenario}"; npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" "${ref%%:*}" --name "^${ref#*:}$" --tags "not @eval and not @captain and not @shipwright"`
- broad: `npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" --tags "not @eval and not @captain and not @shipwright"`
- broad-eval: `set -a; . .env; set +a; OPENROUTER_API_KEY="$HARNESS_OPENROUTER_API_KEY" npx cucumber-js --import "features/step_definitions/tina-eval.js" --tags "@eval and not @captain and not @shipwright"`
- coverage: `npx c8 npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" --tags "not @eval and not @captain and not @shipwright"`
- step-usage: `npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" --format usage-json --tags "not @eval and not @captain and not @shipwright"`
- plank-inventory: `grep -rn '@planks\|@planks-provisional' packages/ --include='*.ts'`
- typecheck: `npx tsc --noEmit`
- lint: `npx gplint features/*.feature && npx @biomejs/biome check packages/ scripts/ features/`
- conformance: none

## Perturbation

- message: `PERTURBATION: consider current durable context; remove when fixed`
- perturb: `throw new Error("PERTURBATION: consider current durable context; remove when fixed");`

## Tiers

- default: @logic
- sandbox: none
- policy: none
- weather: coverage/weather.json
- runrecord: coverage/runrecord.ndjson

## Dependencies

- policy: locked
- dependency: @cucumber/cucumber
- dependency: typescript
- dependency: @biomejs/biome
- dependency: c8
- dependency: gplint
- dependency: tsx

## Outbound

- outbound: `npm -w packages/core run build && npm -w packages/pi run build && npm -w packages/opencode run build`
- outbound: tsx scripts/build-plugins.ts
