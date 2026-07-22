import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Given, Then, When } from "@cucumber/cucumber";

const ARTIFACTS: Record<string, string> = {
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
};

Given("the release metadata for {string}", function (artifact: string) {
	(this as ReleaseWorld).manifest = readManifest(ARTIFACTS[artifact]);
});

When("the artifact version is inspected", function () {
	(this as ReleaseWorld).version = (this as ReleaseWorld).manifest?.version;
});

Then("the version is {string}", function (version: string) {
	assert.equal((this as ReleaseWorld).version, version);
});

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
