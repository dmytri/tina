import assert from "node:assert/strict";
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";

const ROOT = resolve(import.meta.dirname, "../..");
const PROD_IMPORT = /from\s+["']@dk\/tina-(?:core|pi|opencode)["']/;
const PROD_CALLS = /scanText|getPhrases|setPhrases|resetPhrases|TinaPlugin/;

type Adapter = "Pi" | "OpenCode" | "Claude Code";

let stepPatterns: string[] = [];
let plankPatterns: string[] = [];
let pertubationMatches: string[] = [];
let supportedAdapters: Adapter[] = [];
let adapterVerificationFailures: Adapter[] = [];
let adapterPlankFailures: Adapter[] = [];
let staticFailures: string[] = [];

const ADAPTER_VERIFICATION: Record<Adapter, [string, string]> = {
	Pi: ["features/step_definitions/tina-pi.steps.ts", "@dk/pi-tina"],
	OpenCode: [
		"features/step_definitions/tina-opencode.steps.ts",
		"@dk/opencode-tina",
	],
	"Claude Code": [
		"features/step_definitions/tina-claude.steps.ts",
		"plugins/agent-tina/dist/scan.js",
	],
};

const ADAPTER_SEAMS: Record<Adapter, string> = {
	Pi: "packages/pi/src/index.ts",
	OpenCode: "packages/opencode/src/index.ts",
	"Claude Code": "plugins/agent-tina/dist/scan.js",
};

function extractPatterns(dir: string): string[] {
	const patterns: string[] = [];
	for (const file of readdirSync(dir).filter(
		(f) => f.endsWith(".ts") || f.endsWith(".js"),
	)) {
		const src = readFileSync(resolve(dir, file), "utf8");
		const re = /(?:Given|When|Then)\s*\(\s*["'`]([^"'`]+)["'`]/g;
		for (const m of src.matchAll(re)) {
			if (!patterns.includes(m[1])) patterns.push(m[1]);
		}
	}
	return patterns;
}

Given(
	"the implementation directory contains no {string} token",
	(t: string) => {
		pertubationMatches = [];
		for (const d of [
			"packages/core/src",
			"packages/pi/src",
			"packages/opencode/src",
		]) {
			const p = resolve(ROOT, d);
			if (!existsSync(p)) continue;
			try {
				const r = execSync(
					`grep -rn "${t}" "${p}" --include='*.ts' 2>/dev/null || true`,
					{ cwd: ROOT, encoding: "utf8" },
				);
				if (r.trim())
					pertubationMatches = pertubationMatches.concat(
						r.trim().split("\n").filter(Boolean),
					);
			} catch {}
		}
	},
);

Given("the project has step definitions with known patterns", () => {
	stepPatterns = extractPatterns(resolve(ROOT, "features/step_definitions"));
});

Given("production seams carry @planks annotations", () => {
	plankPatterns = [];
	try {
		const r = execSync(
			`grep -rn '@planks\\|@planks-provisional' packages/ --include='*.ts' | grep -v dist/ || true`,
			{ cwd: ROOT, encoding: "utf8" },
		);
		for (const line of r.trim().split("\n").filter(Boolean)) {
			const m = line.match(/@planks\("(.+)"\)/);
			if (m) plankPatterns.push(m[1]);
		}
	} catch {}
});

When("a quiescence scan runs over the implementation paths", () => {});
When(
	"a plank-form check joins plank-inventory against step-usage output",
	() => {},
);
When(
	"a plank-coverage check joins step-usage output against plank-inventory",
	() => {},
);

Then("the scan reports no matching tokens", () => {
	assert.equal(
		pertubationMatches.length,
		0,
		`Found PERTURBATION tokens:\n${pertubationMatches.join("\n")}`,
	);
});

Then(
	"every @planks string matches a currently defined step-definition pattern",
	() => {
		const unmatched = plankPatterns.filter((p) => !stepPatterns.includes(p));
		assert.equal(
			unmatched.length,
			0,
			`@planks patterns not matching any step definition:\n${unmatched.join("\n")}`,
		);
	},
);

Then(
	"every behaviour-bearing step-definition pattern has a matching @planks annotation",
	() => {
		const sdir = resolve(ROOT, "features/step_definitions");
		const behaviourFiles = readdirSync(sdir).filter((f) => {
			if (!f.endsWith(".ts") && !f.endsWith(".js")) return false;
			return PROD_IMPORT.test(readFileSync(resolve(sdir, f), "utf8"));
		});

		const behaviourPatterns: string[] = [];
		for (const file of behaviourFiles) {
			const src = readFileSync(resolve(sdir, file), "utf8");
			const re = /When\s*\(\s*["'`]([^"'`]+)["'`]/g;
			for (const m of src.matchAll(re)) {
				const after = src.slice(m.index, m.index + 300);
				if (PROD_CALLS.test(after) && !behaviourPatterns.includes(m[1])) {
					behaviourPatterns.push(m[1]);
				}
			}
		}

		const uncovered = behaviourPatterns.filter(
			(p) => !plankPatterns.includes(p),
		);
		assert.equal(
			uncovered.length,
			0,
			`Step-definition patterns without a matching @planks:\n${uncovered.join("\n")}\nbehaviourFiles: ${JSON.stringify(behaviourFiles)}\nbehaviourPatterns: ${JSON.stringify(behaviourPatterns)}`,
		);
	},
);

Given("Pi, OpenCode, and Claude Code are supported adapters", () => {
	supportedAdapters = ["Pi", "OpenCode", "Claude Code"];
});

When("binding adapter scenarios are inspected", () => {
	adapterVerificationFailures = supportedAdapters.filter((adapter) => {
		const [path, productionReference] = ADAPTER_VERIFICATION[adapter];
		return !readFileSync(resolve(ROOT, path), "utf8").includes(
			productionReference,
		);
	});
});

Then("each supported adapter executes its production seam", () => {
	assert.deepEqual(adapterVerificationFailures, []);
});

When("implementation paths and plank inventory are inspected", () => {
	adapterPlankFailures = supportedAdapters.filter((adapter) => {
		const source = readFileSync(resolve(ROOT, ADAPTER_SEAMS[adapter]), "utf8");
		return !source.includes("@planks(");
	});
});

Then("every supported adapter seam is included", () => {
	assert.deepEqual(adapterPlankFailures, []);
});

Given("the repository TypeScript source", () => {
	assert.ok(existsSync(resolve(ROOT, "tsconfig.json")));
});

When("the configured typecheck and lint commands run", () => {
	staticFailures = [
		"npx tsc --noEmit",
		"npx gplint features/*.feature && npx @biomejs/biome check packages/ scripts/ features/",
	].flatMap((command) => {
		const result = spawnSync(command, {
			cwd: ROOT,
			encoding: "utf8",
			shell: true,
		});
		return result.status === 0
			? []
			: [`${command}\n${result.stdout}${result.stderr}`];
	});
});

Then("both commands exit successfully", () => {
	assert.deepEqual(staticFailures, []);
});
