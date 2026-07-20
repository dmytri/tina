# Rigging
## Stack
- language: TypeScript
- runtime: node
- packageManager: npm
## Directories
- implementation: src
- specs: features
- verification: none
- assets: assets
- scantlings: none
## Commands
- discover: none
- focused: `ref="{scenario}"; npx cucumber-js "${ref%%:*}" --name "^${ref#*:}$" --tags "not @captain and not @shipwright"`
- broad: `npx cucumber-js --tags "not @captain and not @shipwright"`
- coverage: `npx c8 npx cucumber-js --tags "not @captain and not @shipwright"`
- step-usage: none
- plank-inventory: none
- typecheck: `npx tsc --noEmit`
- lint: `npx gplint features/*.feature && npx biome check src/`
- conformance: none
## Perturbation
- message: `PERTURBATION: consider current durable context; remove when fixed`
- perturb: `throw new Error("PERTURBATION: consider current durable context; remove when fixed");`
## Tiers
- default: none
- sandbox: none
- policy: none
- weather: none
- runrecord: none
## Dependencies
- policy: locked
- dependency: @cucumber/cucumber
- dependency: typescript
- dependency: @biomejs/biome
- dependency: c8
- dependency: gplint
- dependency: tsx
## Outbound
- outbound: none
