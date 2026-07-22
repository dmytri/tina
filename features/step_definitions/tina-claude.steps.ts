import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";

type ClaudeWorld = {
	directory?: string;
	records?: unknown[];
	decision?: Record<string, unknown>;
};

After(async function () {
	const directory = (this as ClaudeWorld).directory;
	if (directory) await rm(directory, { recursive: true, force: true });
});

Given(
	"a Claude transcript contains a human prompt and disallowed assistant output",
	function () {
		(this as ClaudeWorld).records = [
			{ type: "user", message: { role: "user", content: "start" } },
			{
				type: "assistant",
				message: { role: "assistant", content: "try a different approach" },
			},
		];
	},
);

Given("a Claude transcript contains disallowed assistant output", function () {
	(this as ClaudeWorld).records = [
		{
			type: "assistant",
			message: { role: "assistant", content: "try a different approach" },
		},
	];
});

Given("the transcript ends with a denied tool result", function () {
	const records = (this as ClaudeWorld).records;
	assert.ok(records, "Claude transcript is configured");
	records.push({
		type: "user",
		message: {
			role: "user",
			content: [
				{ type: "tool_result", tool_use_id: "tool-1", content: "denied" },
			],
		},
	});
});

Given("the transcript ends with a new human prompt", function () {
	const records = (this as ClaudeWorld).records;
	assert.ok(records, "Claude transcript is configured");
	records.push({
		type: "user",
		message: { role: "user", content: "continue" },
	});
});

When("another tool call reaches the PreToolUse hook", async function () {
	const world = this as ClaudeWorld;
	world.directory = await mkdtemp(join(tmpdir(), "tina-claude-"));
	const transcript = join(world.directory, "transcript.jsonl");
	assert.ok(world.records, "Claude transcript is configured");
	await writeFile(
		transcript,
		`${world.records.map((record) => JSON.stringify(record)).join("\n")}\n`,
	);
	const output = await runHook(transcript);
	world.decision = output ? JSON.parse(output) : {};
});

Then(
	"the hook denies the tool call with the TINA rejection message",
	function () {
		const output = (this as ClaudeWorld).decision?.hookSpecificOutput as
			| Record<string, unknown>
			| undefined;
		assert.equal(output?.permissionDecision, "deny");
		assert.match(String(output?.permissionDecisionReason), /^TINA blocked:/);
	},
);

Then("the hook permits the tool call", function () {
	assert.deepEqual((this as ClaudeWorld).decision, {});
});

function runHook(transcript: string): Promise<string> {
	return new Promise((resolveOutput, reject) => {
		const child = spawn("node", [resolve("plugins/agent-tina/dist/scan.js")], {
			stdio: ["pipe", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolveOutput(stdout.trim());
			else reject(new Error(`Claude hook exited ${code}: ${stderr}`));
		});
		child.stdin.end(JSON.stringify({ transcript_path: transcript }));
	});
}
