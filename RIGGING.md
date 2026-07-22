# Rigging

Project tooling values for Shipshape roles. Values only, not procedure.
Procedure lives in the skills. Every role reads this on open.

## Stack

- language: TypeScript
- runtime: node 24.18.0
- packageManager: npm 12.0.1 (workspaces)

## Directories

- implementation: packages/*/src
- implementation: plugins/agent-tina/dist
- specs: features
- verification: features/step_definitions
- assets: assets
- scantlings: scantlings/dependency-cruiser.json

## Commands

- discover: `npx cucumber-js --dry-run --import tsx --import "features/step_definitions/**/*.ts" --tags "not @eval and not @captain and not @shipwright"`
- focused: `ref="{scenario}"; npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" "${ref%%:*}" --name "^${ref#*:}$" --tags "not @eval and not @captain and not @shipwright"`
- broad: `npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" --parallel 2 --tags "not @eval and not @captain and not @shipwright"`
- broad-eval: `set -a; . .env; set +a; OPENROUTER_API_KEY="$HARNESS_OPENROUTER_API_KEY" npx cucumber-js --import "features/step_definitions/tina-eval.js" --tags "@eval and not @captain and not @shipwright"`
- coverage: `npx c8 npx cucumber-js --import tsx --import "features/step_definitions/**/*.ts" --parallel 2 --tags "not @eval and not @captain and not @shipwright"`
- coverage-eval: `set -a; . .env; set +a; OPENROUTER_API_KEY="$HARNESS_OPENROUTER_API_KEY" npx c8 npx cucumber-js --import "features/step_definitions/tina-eval.js" --tags "@eval and not @captain and not @shipwright"`
- step-usage: `npx cucumber-js --dry-run --import tsx --import "features/step_definitions/**/*.ts" --import "features/step_definitions/tina-eval.js" --format usage-json --tags "not @captain and not @shipwright"`
- plank-inventory: `grep -rn '@planks\|@planks-provisional' packages/*/src plugins/agent-tina/dist --include='*.ts' --include='*.js'`
- typecheck: `npx tsc --noEmit`
- lint: `npx gplint features/*.feature && npx @biomejs/biome check packages/ plugins/ scripts/ features/`
- conformance: `npx depcruise --config "scantlings/dependency-cruiser.json" packages/*/src plugins/agent-tina/dist`

## Perturbation

- message: `PERTURBATION: consider current durable context; remove when fixed`
- perturb: `throw new Error("PERTURBATION: consider current durable context; remove when fixed");`

## Tiers

- default: @logic
- sandbox: none
- eval: @eval
- policy: @logic uses local Node.js and repository files
- policy-eval: @eval reads HARNESS_OPENROUTER_API_KEY and HARNESS_EVAL_MODEL from .env and provisions throwaway HOME and XDG directories
- weather: coverage/weather.json
- runrecord: coverage/runrecord.ndjson

## Dependencies

- policy: locked
- dependency: @cucumber/cucumber
- dependency: @changesets/cli
- dependency: typescript
- dependency: @biomejs/biome
- dependency: c8
- dependency: gplint
- dependency: tsx
- dependency: @earendil-works/pi-coding-agent
- dependency: @opencode-ai/plugin
- dependency: @types/node
- dependency: @dk/tina-core
- dependency: dependency-cruiser

## Outbound

- outbound: npm registry
- ship: `npm publish --workspaces`
- verify: `test "$(npm view @dk/tina-core version)" = "$(node -p "require('./packages/core/package.json').version")" && test "$(npm view @dk/pi-tina version)" = "$(node -p "require('./packages/pi/package.json').version")" && test "$(npm view @dk/opencode-tina version)" = "$(node -p "require('./packages/opencode/package.json').version")"`
- outbound: GitHub repository
- ship: `git push origin main --follow-tags`
- verify: `test "$(git rev-parse main)" = "$(git ls-remote origin refs/heads/main | cut -f1)"`
