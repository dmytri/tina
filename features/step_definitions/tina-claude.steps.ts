import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";

type ClaudeWorld = {
	directory?: string;
	records?: unknown[];
	transcriptLines?: string[];
	decision?: Record<string, unknown>;
	stderr?: string;
	environment?: NodeJS.ProcessEnv;
	workingDirectory?: string;
	transcriptPath?: string;
	pluginConfig?: string;
};

After(async function () {
	const directory = (this as ClaudeWorld).directory;
	if (directory) await rm(directory, { recursive: true, force: true });
	const pluginConfig = (this as ClaudeWorld).pluginConfig;
	if (pluginConfig) await rm(pluginConfig, { force: true });
});

Given(
	"{string} configures {string} for the Claude Code hook",
	async function (source: string, phrase: string) {
		const world = this as ClaudeWorld;
		world.directory = await mkdtemp(join(tmpdir(), "tina-claude-config-"));
		if (source === "TINA_PHRASES") {
			world.environment = {
				...process.env,
				TINA_PHRASES: JSON.stringify([phrase]),
			};
		} else if (source === "project .tina.json") {
			world.workingDirectory = world.directory;
			await writeFile(
				join(world.directory, ".tina.json"),
				JSON.stringify({ phrases: [phrase] }),
			);
		} else {
			world.pluginConfig = resolve("plugins/agent-tina/.tina.json");
			await writeFile(
				world.pluginConfig,
				JSON.stringify({ phrases: [phrase] }),
			);
		}
	},
);

Given(
	"a Claude transcript contains assistant output {string}",
	function (text: string) {
		(this as ClaudeWorld).records = [
			{ type: "user", message: { role: "user", content: "start" } },
			{ type: "assistant", message: { role: "assistant", content: text } },
		];
	},
);

Given(
	"the project {string} contains invalid phrase configuration",
	async function (file: string) {
		const world = this as ClaudeWorld;
		world.directory = await mkdtemp(join(tmpdir(), "tina-claude-invalid-"));
		world.workingDirectory = world.directory;
		await writeFile(join(world.directory, file), "{");
	},
);

Given(
	"a Claude transcript contains {string} in a {string} block",
	function (text: string, block: string) {
		(this as ClaudeWorld).records = [
			{ type: "user", message: { role: "user", content: "start" } },
			{
				type: "assistant",
				message: {
					role: "assistant",
					content: [{ type: block, [block]: text }],
				},
			},
		];
	},
);

Given(
	"the Claude Code hook receives an unavailable transcript path",
	function () {
		(this as ClaudeWorld).transcriptPath = join(
			tmpdir(),
			`tina-missing-${process.pid}.jsonl`,
		);
	},
);

Given("a Claude transcript contains a malformed record", function () {
	(this as ClaudeWorld).transcriptLines = ["{not-json"];
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
	world.directory ??= await mkdtemp(join(tmpdir(), "tina-claude-"));
	const transcript =
		world.transcriptPath ?? join(world.directory, "transcript.jsonl");
	if (!world.transcriptPath) {
		const lines =
			world.transcriptLines ??
			world.records?.map((record) => JSON.stringify(record));
		assert.ok(lines, "Claude transcript is configured");
		await writeFile(transcript, `${lines.join("\n")}\n`);
	}
	const output = await runHook(
		transcript,
		world.environment,
		world.workingDirectory,
	);
	world.stderr = output.stderr;
	world.decision = output.stdout ? JSON.parse(output.stdout) : {};
});

When("the Claude Code hook loads", async function () {
	const world = this as ClaudeWorld;
	const output = await runHook(
		join(tmpdir(), `tina-missing-${process.pid}.jsonl`),
		world.environment,
		world.workingDirectory,
	);
	world.stderr = output.stderr;
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

Then("the hook reports the invalid configuration path", function () {
	assert.match(
		(this as ClaudeWorld).stderr ?? "",
		/invalid \.tina\.json at .*\.tina\.json:/,
	);
});

Then(
	"the hook warns that TINA is inactive because the transcript is unavailable",
	function () {
		assert.match(
			(this as ClaudeWorld).stderr ?? "",
			/TINA.*inactive.*transcript.*unavailable/i,
		);
	},
);

Then(
	"the hook warns that TINA is inactive because the transcript record is malformed",
	function () {
		assert.match(
			(this as ClaudeWorld).stderr ?? "",
			/TINA.*inactive.*transcript.*malformed/i,
		);
	},
);

function runHook(
	transcript: string,
	environment: NodeJS.ProcessEnv = process.env,
	workingDirectory = process.cwd(),
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolveOutput, reject) => {
		const child = spawn("node", [resolve("plugins/agent-tina/dist/scan.js")], {
			cwd: workingDirectory,
			env: environment,
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
			if (code === 0)
				resolveOutput({ stdout: stdout.trim(), stderr: stderr.trim() });
			else reject(new Error(`Claude hook exited ${code}: ${stderr}`));
		});
		child.stdin.end(JSON.stringify({ transcript_path: transcript }));
	});
}
