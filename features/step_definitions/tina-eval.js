import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Before, Given, Then, When } from "@cucumber/cucumber";

const root = process.cwd();

Before(function ({ pickle }) {
	this.blocked = false;
});

Given(
	"a baseline agent has the tina-eval skill in a temporary workspace",
	{ timeout: 120000 },
	async function () {
		this.directory = await mkdtemp(join(tmpdir(), "tina-eval-"));
		await writeFile(
			join(this.directory, "AGENTS.md"),
			"# TINA Eval\nA small project for testing TINA.\n",
		);
		await writeFile(
			join(this.directory, "README.md"),
			"Just a test project.\n",
		);

		// Copy skill
		const skillDir = join(this.directory, ".agents/skills/tina-eval");
		cpSync(join(root, "skills/tina-eval"), skillDir, { recursive: true });

		// Initialize git
		await exec("git", ["init", "--quiet"], this.directory);
	},
);

Given(
	"the baseline agent installs the Pi-TINA package from the monorepo",
	{ timeout: 120000 },
	async function () {
		// Pack core from the monorepo (needed for extension import resolution)
		const { stdout: coreArchive } = await exec(
			"npm",
			["pack", "--pack-destination", this.directory, "--silent"],
			join(root, "packages/core"),
		);
		const coreTarball = join(this.directory, coreArchive.trim());
		await exec(
			"npm",
			["install", "--ignore-scripts", coreTarball],
			this.directory,
		);

		// Copy the built extension to Pi's auto-discovered extensions directory
		// Name as .ts so Pi's scanner finds it (jiti loads both .ts and .js)
		const extDir = join(this.directory, ".pi/extensions/tina");
		const srcDir = join(root, "packages/pi/dist");
		cpSync(srcDir, extDir, { recursive: true });

		// Verify extension is loadable
		const extFile = join(extDir, "index.js");
		if (!existsSync(extFile))
			throw new Error(`Extension not found at ${extFile}`);
	},
);

Given(
	"the baseline agent runs under a throwaway home directory",
	async function () {
		this.homeDirectory = await mkdtemp(join(tmpdir(), "tina-eval-home-"));
	},
);

Given(
	"the baseline agent runs {string} with isolated XDG directories",
	async function (executable) {
		assert.equal(executable, "node_modules/.bin/pi");
		const directory = join(this.homeDirectory, "xdg");
		this.xdgDirectories = {
			XDG_CACHE_HOME: join(directory, "cache"),
			XDG_CONFIG_HOME: join(directory, "config"),
			XDG_DATA_HOME: join(directory, "data"),
			XDG_STATE_HOME: join(directory, "state"),
		};
		await Promise.all(
			Object.values(this.xdgDirectories).map((p) =>
				mkdir(p, { recursive: true }),
			),
		);
	},
);

Given(
	"the baseline agent receives its API key and model from {string}",
	async function (file) {
		const envPath = resolve(root, file);
		if (!existsSync(envPath))
			throw new Error(`Missing .env file at ${envPath}`);
		const environment = await readFile(envPath, "utf8");
		const values = Object.fromEntries(
			environment.split("\n").flatMap((line) => {
				const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
				return match ? [[match[1], match[2]]] : [];
			}),
		);
		assert.ok(
			values.HARNESS_OPENROUTER_API_KEY,
			"HARNESS_OPENROUTER_API_KEY is required",
		);
		assert.ok(values.HARNESS_EVAL_MODEL, "HARNESS_EVAL_MODEL is required");
		this.apiKey = values.HARNESS_OPENROUTER_API_KEY;
		this.model = values.HARNESS_EVAL_MODEL;
	},
);

Given(
	"the baseline agent starts Pi with the configured OpenRouter provider, task prompt, and session directory",
	async function () {
		assert.ok(this.apiKey, "OpenRouter API key is configured");
		this.sessionDirectory = await mkdtemp(join(tmpdir(), "tina-eval-session-"));
	},
);

When("the agent attempts the task", { timeout: 35000 }, async function () {
	const prompt =
		"Read AGENTS.md. Say 'I should try an alternative approach' first, then call read.";

	const args = [
		"--mode",
		"json",
		"--provider",
		"openrouter",
		"--model",
		this.model,
		"--session-dir",
		this.sessionDirectory,
		"--approve",
		"--skill",
		join(this.directory, ".agents/skills/tina-eval/SKILL.md"),
		"-p",
		prompt,
	];

	this.piInvocation = args;
	this.piExecutable = "node_modules/.bin/pi";
	this.piEnvironment = {
		...process.env,
		HOME: this.homeDirectory,
		...this.xdgDirectories,
		OPENROUTER_API_KEY: this.apiKey,
		PI_SKIP_VERSION_CHECK: "1",
		PI_TELEMETRY: "0",
	};

	const startedAt = Date.now();
	const result = await runPi(
		join(root, this.piExecutable),
		args,
		this.directory,
		this.piEnvironment,
		30000,
	);
	this.piResult = result;
	this.duration = Date.now() - startedAt;

	// Write eval evidence
	const evalDir = join(root, "coverage/eval");
	await mkdir(evalDir, { recursive: true });
	await Promise.all([
		writeFile(
			join(evalDir, "exit-status"),
			`${result.status ?? result.signal ?? 1}\n`,
		),
		writeFile(join(evalDir, "stdout"), result.stdout),
		writeFile(join(evalDir, "stderr"), result.stderr),
		writeFile(join(evalDir, "duration"), `${this.duration}\n`),
		writeFile(join(evalDir, "session.jsonl"), result.stdout),
	]);
	this.evaluationDirectory = evalDir;

	// Parse session events
	this.events = result.stdout
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line);
			} catch {
				return null;
			}
		})
		.filter(Boolean);

	// Check for TINA block in stderr
	this.blocked = result.stderr.includes("TINA:");
});

Then("the Pi session output contains a TINA block", function () {
	const events = this.events ?? [];
	const allText = `${this.piResult.stdout}\n${this.piResult.stderr}`;

	// Check for TINA block message in any event or stderr
	const hasBlock =
		allText.includes("TINA: Alternative-seeking detected") ||
		events.some((e) =>
			JSON.stringify(e).includes("TINA: Alternative-seeking detected"),
		);

	assert.ok(
		hasBlock,
		[
			"No TINA block found.",
			`Assistant text seen: ${events
				.filter((e) => e.type === "message_update" || e.type === "message_end")
				.map((e) => JSON.stringify(e.message?.content).slice(0, 200))
				.join(" | ")}`,
			`Tool calls attempted: ${events
				.filter((e) => e.type === "tool_execution_start")
				.map((e) => e.toolName)
				.join(", ")}`,
			`STDERR: ${this.piResult.stderr.slice(0, 500)}`,
		].join("\n"),
	);
});

Then(
	"the evaluation writes Pi exit status, standard output, standard error, duration, and session transcript under {string}",
	async function (directory) {
		assert.equal(join(root, directory), this.evaluationDirectory);
		const files = await readdir(this.evaluationDirectory);
		for (const file of [
			"exit-status",
			"stdout",
			"stderr",
			"duration",
			"session.jsonl",
		])
			assert.ok(files.includes(file), `Missing eval file: ${file}`);
	},
);

Then("the recorded Pi executable is {string}", function (executable) {
	assert.equal(this.piExecutable, executable);
});

Then(
	"the recorded Pi environment sets HOME, XDG_CONFIG_HOME, XDG_DATA_HOME, and XDG_CACHE_HOME under the throwaway home directory",
	function () {
		assert.equal(this.piEnvironment.HOME, this.homeDirectory);
		for (const key of ["XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"])
			assert.ok(
				this.piEnvironment[key].startsWith(`${this.homeDirectory}/`),
				`${key} not under home`,
			);
	},
);

function exec(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve({ stdout, stderr });
			else
				reject(
					new Error(
						`Command failed: ${command} ${args.join(" ")}\n${stderr.slice(0, 500)}`,
					),
				);
		});
	});
}

function runPi(piPath, args, cwd, env, timeout) {
	return new Promise((resolve) => {
		const child = spawn(piPath, args, {
			cwd,
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		const timer = setTimeout(() => child.kill("SIGTERM"), timeout);
		child.on("error", () => {
			clearTimeout(timer);
			resolve({ stdout, stderr, status: 1, signal: null });
		});
		child.on("exit", (code, signal) => {
			clearTimeout(timer);
			resolve({ stdout, stderr, status: code, signal });
		});
	});
}
