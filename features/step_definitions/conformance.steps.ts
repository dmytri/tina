import assert from "node:assert/strict";
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";
import ts from "typescript";

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
let contentFailures: string[] = [];
let latchVerificationFailures: string[] = [];
let concurrencyFailures: string[] = [];
let plankDeclarationFailures: string[] = [];
let provisionalPlankFailures: string[] = [];
let implementationPaths: string[] = [];
let lintResult: ReturnType<typeof spawnSync> | undefined;
let dependencyResult: ReturnType<typeof spawnSync> | undefined;
let phraseImplementationCount = 0;

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
	const rigging = readFileSync(resolve(ROOT, "RIGGING.md"), "utf8");
	staticFailures = ["typecheck", "lint"].flatMap((name) => {
		const command = rigging.match(
			new RegExp(`^- ${name}: \`([^\`]+)\``, "m"),
		)?.[1];
		assert.ok(command, `${name} command is configured`);
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

Given("the TINA content catalog at {string}", (path: string) => {
	const catalog = JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
	const values: string[] = [];
	const visit = (value: unknown) => {
		if (typeof value === "string") values.push(value);
		else if (value && typeof value === "object")
			Object.values(value).forEach(visit);
	};
	visit(catalog);
	contentFailures = values;
});

Given("the TINA production modules emit user-facing text", () => {
	assert.ok(contentFailures.length > 0, "content catalog is loaded");
});

When("production string sources are inspected", () => {
	const catalogValues = contentFailures;
	contentFailures = [];
	for (const path of [
		"packages/core/src/index.ts",
		"packages/pi/src/index.ts",
		"packages/opencode/src/index.ts",
		"plugins/agent-tina/dist/scan.js",
	]) {
		const source = readFileSync(resolve(ROOT, path), "utf8");
		const sourceFile = ts.createSourceFile(
			path,
			source,
			ts.ScriptTarget.Latest,
			true,
			path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
		);
		const literals: string[] = [];
		const visit = (node: ts.Node) => {
			if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
				literals.push(node.text);
			else if (ts.isTemplateExpression(node))
				literals.push(node.getText(sourceFile).slice(1, -1));
			ts.forEachChild(node, visit);
		};
		visit(sourceFile);
		for (const text of literals.filter(
			(value) =>
				value.startsWith("TINA") ||
				value.startsWith("try ") ||
				value === "Reset TINA block",
		)) {
			const shape = text.replace(/\$\{[^}]+\}/g, "${value}");
			const found = catalogValues.some(
				(value) => value.replace(/\$\{[^}]+\}/g, "${value}") === shape,
			);
			if (!found) contentFailures.push(`${path}: ${text}`);
		}
	}
});

Then("every product-facing string resolves from a content catalog", () => {
	assert.deepEqual(contentFailures, []);
});

Given("the binding TINA latch scenarios", () => {
	latchVerificationFailures = [];
});

When("their step definitions are inspected", () => {
	const requirements: Record<string, string[]> = {
		"features/step_definitions/tina.steps.ts": ["@dk/tina-core", "scanText("],
		"features/step_definitions/tina-pi.steps.ts": ["@dk/pi-tina", "toolCall()"],
		"features/step_definitions/tina-opencode.steps.ts": [
			"@dk/opencode-tina",
			'"tool.execute.before"',
		],
		"features/step_definitions/tina-claude.steps.ts": [
			"plugins/agent-tina/dist/scan.js",
			"runHook(",
		],
	};
	for (const [path, markers] of Object.entries(requirements)) {
		const source = readFileSync(resolve(ROOT, path), "utf8");
		for (const marker of markers)
			if (!source.includes(marker))
				latchVerificationFailures.push(`${path}: ${marker}`);
	}
});

Then("each latch action and assertion executes a production seam", () => {
	assert.deepEqual(latchVerificationFailures, []);
});

Given("the logic scenarios use isolated state", () => {
	concurrencyFailures = [];
});

When("the configured logic tier runs", () => {
	const rigging = readFileSync(resolve(ROOT, "RIGGING.md"), "utf8");
	const broad = rigging.match(/^- broad: `([^`]+)`/m)?.[1] ?? "";
	if (!/--parallel(?:=|\s+)\d+/.test(broad))
		concurrencyFailures.push(
			"RIGGING.md broad command has no --parallel worker count",
		);
});

Then("independent scenarios execute concurrently", () => {
	assert.deepEqual(concurrencyFailures, []);
});

Given(
	"TypeScript and JavaScript production seams carry plank annotations",
	() => {
		plankDeclarationFailures = [];
		provisionalPlankFailures = [];
	},
);

When("the TypeScript compiler API checks plank declarations", () => {
	for (const directory of [
		"packages/core/src",
		"packages/pi/src",
		"packages/opencode/src",
		"plugins/agent-tina/dist",
	]) {
		for (const file of readdirSync(resolve(ROOT, directory)).filter((name) =>
			/\.(?:ts|js)$/.test(name),
		)) {
			const path = resolve(ROOT, directory, file);
			const source = readFileSync(path, "utf8");
			const sourceFile = ts.createSourceFile(
				path,
				source,
				ts.ScriptTarget.Latest,
				true,
				file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
			);
			const tags = new Set<string>();
			const visit = (node: ts.Node) => {
				for (const tag of ts.getJSDocTags(node)) {
					if (
						tag.tagName.text === "planks" ||
						tag.tagName.text === "planks-provisional"
					) {
						tags.add(
							`@${tag.tagName.text}${typeof tag.comment === "string" ? tag.comment : ""}`,
						);
					}
				}
				ts.forEachChild(node, visit);
			};
			visit(sourceFile);
			for (const match of source.matchAll(
				/@(planks(?:-provisional)?)\("([^"]+)"\)/g,
			)) {
				const key = `@${match[1]}(\"${match[2]}\")`;
				if (!tags.has(key))
					plankDeclarationFailures.push(`${directory}/${file}: ${key}`);
				if (
					match[1] === "planks-provisional" &&
					!captainScenarioExists(match[2])
				)
					provisionalPlankFailures.push(`${directory}/${file}: ${match[2]}`);
			}
		}
	}
});

Then("every plank is a docblock tag on a declaration", () => {
	assert.deepEqual(plankDeclarationFailures, []);
});

Then(
	"every provisional plank names a scenario that carries {string}",
	(tag: string) => {
		assert.equal(tag, "@captain");
		assert.deepEqual(provisionalPlankFailures, []);
	},
);

Given("RIGGING.md lists each production implementation path", () => {
	implementationPaths = [
		...readFileSync(resolve(ROOT, "RIGGING.md"), "utf8").matchAll(
			/^- implementation: (.+)$/gm,
		),
	].map((match) => match[1]);
	assert.ok(implementationPaths.length > 0);
});

When("the configured lint command runs", () => {
	const command = readFileSync(resolve(ROOT, "RIGGING.md"), "utf8").match(
		/^- lint: `([^`]+)`/m,
	)?.[1];
	assert.ok(command, "lint command is configured");
	lintResult = spawnSync(command, { cwd: ROOT, encoding: "utf8", shell: true });
});

Then("every implementation path passes lint", () => {
	assert.equal(
		lintResult?.status,
		0,
		`${lintResult?.stdout ?? ""}${lintResult?.stderr ?? ""}`,
	);
	const command =
		readFileSync(resolve(ROOT, "RIGGING.md"), "utf8").match(
			/^- lint: `([^`]+)`/m,
		)?.[1] ?? "";
	for (const path of implementationPaths) {
		const root = path.split("/")[0];
		assert.ok(command.includes(root), `${path} is not covered by lint command`);
	}
});

Given("the adapter and core module import graph", () => {
	dependencyResult = undefined;
});

Given("the boundary policy in {string}", (path: string) => {
	assert.ok(existsSync(resolve(ROOT, path)), `${path} exists`);
});

When("dependency-cruiser checks the implementation paths", () => {
	const command = readFileSync(resolve(ROOT, "RIGGING.md"), "utf8").match(
		/^- conformance: `([^`]+)`/m,
	)?.[1];
	assert.ok(command, "conformance command is configured");
	dependencyResult = spawnSync(command, {
		cwd: ROOT,
		encoding: "utf8",
		shell: true,
	});
});

Then("adapters may import core", () => {
	assert.equal(
		dependencyResult?.status,
		0,
		`${dependencyResult?.stdout ?? ""}${dependencyResult?.stderr ?? ""}`,
	);
});

Then("core does not import an adapter", () => {
	assert.equal(
		dependencyResult?.status,
		0,
		`${dependencyResult?.stdout ?? ""}${dependencyResult?.stderr ?? ""}`,
	);
});

Given("each supported adapter detects configured phrases", () => {
	for (const path of Object.values(ADAPTER_SEAMS))
		assert.match(readFileSync(resolve(ROOT, path), "utf8"), /scanText|phrases/);
});

When("registered phrase-detection implementations are inspected", () => {
	phraseImplementationCount = 0;
	for (const directory of [
		"packages/core/src",
		"packages/pi/src",
		"packages/opencode/src",
	]) {
		for (const file of readdirSync(resolve(ROOT, directory)).filter((name) =>
			name.endsWith(".ts"),
		)) {
			phraseImplementationCount += [
				...readFileSync(resolve(ROOT, directory, file), "utf8").matchAll(
					/(?:function|const)\s+scanText\b/g,
				),
			].length;
		}
	}
});

Then("one production seam implements phrase detection", () => {
	assert.equal(phraseImplementationCount, 1);
});

function captainScenarioExists(reference: string): boolean {
	const separator = reference.lastIndexOf(":");
	if (separator < 0) return false;
	const path = resolve(ROOT, reference.slice(0, separator));
	const name = reference.slice(separator + 1);
	if (!existsSync(path)) return false;
	const source = readFileSync(path, "utf8");
	const scenario = source.indexOf(`Scenario: ${name}`);
	const outline = source.indexOf(`Scenario Outline: ${name}`);
	const index = Math.max(scenario, outline);
	if (index < 0) return false;
	const previousScenario = Math.max(
		source.lastIndexOf("Scenario:", index - 1),
		source.lastIndexOf("Scenario Outline:", index - 1),
	);
	const tags = source.slice(previousScenario < 0 ? 0 : previousScenario, index);
	return /@captain\b/.test(tags);
}
