import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { After, Given, Then, When } from "@cucumber/cucumber";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const ARTIFACTS: Record<string, string> = {
	"Core npm package": "packages/core/package.json",
	"OpenCode npm package": "packages/opencode/package.json",
	"Pi npm package": "packages/pi/package.json",
	"agent-tina plugin": "plugins/agent-tina/.claude-plugin/plugin.json",
};

const ADAPTERS: Record<string, string> = {
	OpenCode: "packages/opencode/package.json",
	Pi: "packages/pi/package.json",
};

type ReleaseWorld = {
	manifest?: { version?: string; dependencies?: Record<string, string> };
	version?: string;
	range?: string;
	directory?: string;
};

After(async function () {
	const directory = (this as ReleaseWorld).directory;
	if (directory) await rm(directory, { recursive: true, force: true });
});

Given("the release metadata for {string}", function (artifact: string) {
	(this as ReleaseWorld).manifest = readManifest(ARTIFACTS[artifact]);
});

When("the artifact version is inspected", function () {
	(this as ReleaseWorld).version = (this as ReleaseWorld).manifest?.version;
});

Then("the version is {string}", function (version: string) {
	assert.equal((this as ReleaseWorld).version, version);
});

Given(
	"copied release metadata with Open Plugin version {string}",
	async function (version: string) {
		const world = this as ReleaseWorld;
		world.directory = await mkdtemp(join(tmpdir(), "tina-release-"));
		for (const path of [
			"packages/core/package.json",
			"plugins/agent-tina/.plugin/plugin.json",
			"plugins/agent-tina/.claude-plugin/plugin.json",
			"marketplace.json",
			"scripts/build-plugins.ts",
		]) {
			const destination = join(world.directory, path);
			await mkdir(dirname(destination), { recursive: true });
			await cp(resolve(ROOT, path), destination);
		}
		for (const path of [
			"plugins/agent-tina/.plugin/plugin.json",
			"plugins/agent-tina/.claude-plugin/plugin.json",
		]) {
			const manifest = await readManifestAsync(join(world.directory, path));
			manifest.version = version;
			await writeManifest(join(world.directory, path), manifest);
		}
		const marketplacePath = join(world.directory, "marketplace.json");
		const marketplace = await readManifestAsync(marketplacePath);
		marketplace.plugins[0].version = version;
		await writeManifest(marketplacePath, marketplace);
	},
);

Given(
	"the copied core package version is {string}",
	async function (version: string) {
		const directory = copiedDirectory(this);
		const path = join(directory, "packages/core/package.json");
		const manifest = await readManifestAsync(path);
		manifest.version = version;
		await writeManifest(path, manifest);
	},
);

When("Open Plugin release metadata is synchronized", async function () {
	const directory = copiedDirectory(this);
	await runNode(join(directory, "scripts/build-plugins.ts"));
});

Then(
	"both copied plugin manifests identify version {string}",
	async function (version: string) {
		const directory = copiedDirectory(this);
		for (const path of [
			"plugins/agent-tina/.plugin/plugin.json",
			"plugins/agent-tina/.claude-plugin/plugin.json",
		]) {
			assert.equal(
				(await readManifestAsync(join(directory, path))).version,
				version,
			);
		}
	},
);

Then(
	"the copied marketplace entry identifies version {string}",
	async function (version: string) {
		const marketplace = await readManifestAsync(
			join(copiedDirectory(this), "marketplace.json"),
		);
		assert.equal(marketplace.plugins[0].version, version);
	},
);

Then(
	"the copied core package version remains {string}",
	async function (version: string) {
		const manifest = await readManifestAsync(
			join(copiedDirectory(this), "packages/core/package.json"),
		);
		assert.equal(manifest.version, version);
	},
);

Given("the package manifest for {string}", function (adapter: string) {
	(this as ReleaseWorld).manifest = readManifest(ADAPTERS[adapter]);
});

When("the core dependency range is inspected", function () {
	(this as ReleaseWorld).range = (
		this as ReleaseWorld
	).manifest?.dependencies?.["@dk/tina-core"];
});

Then("the range accepts {string}", function (version: string) {
	assert.ok(accepts((this as ReleaseWorld).range, version));
});

Then("the range excludes {string}", function (version: string) {
	assert.equal(accepts((this as ReleaseWorld).range, version), false);
});

function readManifest(path: string | undefined) {
	assert.ok(path, "release artifact is configured");
	return JSON.parse(readFileSync(resolve(path), "utf8"));
}

async function readManifestAsync(path: string) {
	return JSON.parse(await readFile(path, "utf8"));
}

async function writeManifest(path: string, manifest: unknown): Promise<void> {
	await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function copiedDirectory(world: unknown): string {
	const directory = (world as ReleaseWorld).directory;
	assert.ok(directory, "release metadata is copied");
	return directory;
}

function runNode(script: string): Promise<void> {
	return new Promise((resolveRun, reject) => {
		const child = spawn(
			process.execPath,
			["--import", import.meta.resolve("tsx"), script],
			{ stdio: ["ignore", "ignore", "pipe"] },
		);
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("exit", (status) => {
			if (status === 0) resolveRun();
			else reject(new Error(`metadata sync exited ${status}: ${stderr}`));
		});
	});
}

function accepts(range: string | undefined, version: string): boolean {
	assert.ok(range, "core dependency range is present");
	if (range === "*") return true;
	if (!range.startsWith("^")) return range === version;
	const [major, minor, patch] = range.slice(1).split(".").map(Number);
	const [candidateMajor, candidateMinor, candidatePatch] = version
		.split(".")
		.map(Number);
	return (
		candidateMajor === major &&
		(candidateMinor > minor ||
			(candidateMinor === minor && candidatePatch >= patch))
	);
}
