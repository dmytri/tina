import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

export type PiSession = {
	assistant: (content: unknown) => Promise<void>;
	toolCall: () => Promise<{ block?: boolean; reason?: string } | undefined>;
	input: () => Promise<void>;
	command: (name: string) => Promise<void>;
};

type PiWorld = {
	piSession?: PiSession;
	piSessions?: Map<string, PiSession>;
	directory?: string;
	homeDirectory?: string;
	settingsLocation?: string;
	childResult?: { stdout: string; stderr: string; status: number | null };
};

After(async function () {
	const world = this as PiWorld;
	if (world.directory)
		await rm(world.directory, { recursive: true, force: true });
	if (world.homeDirectory)
		await rm(world.homeDirectory, { recursive: true, force: true });
});

Given("a Pi session is running with TINA loaded", async function () {
	(this as PiWorld).piSession = await createPiSession();
});

Given(
	"Pi sessions {string} and {string} use TINA",
	async function (first: string, second: string) {
		(this as PiWorld).piSessions = new Map([
			[first, await createPiSession()],
			[second, await createPiSession()],
		]);
	},
);

Given(
	"Pi settings at {string} configure {string}",
	async function (location: string, phrase: string) {
		const world = this as PiWorld;
		world.directory = await mkdtemp(join(tmpdir(), "tina-pi-project-"));
		world.homeDirectory = await mkdtemp(join(tmpdir(), "tina-pi-home-"));
		world.settingsLocation = location;
		const file = location.startsWith("~")
			? join(world.homeDirectory, ".pi/agent/settings.json")
			: join(world.directory, location);
		await mkdir(dirname(file), { recursive: true });
		await writeFile(file, JSON.stringify({ tina: { phrases: [phrase] } }));
	},
);

Given(
	"{string} contains invalid TINA phrase settings",
	async function (location: string) {
		const world = this as PiWorld;
		world.directory = await mkdtemp(join(tmpdir(), "tina-pi-invalid-"));
		world.homeDirectory = await mkdtemp(join(tmpdir(), "tina-pi-home-"));
		const file = join(world.directory, location);
		await mkdir(dirname(file), { recursive: true });
		await writeFile(file, "{");
	},
);

Given("a Pi session is latched", async function () {
	const world = this as PiWorld;
	world.piSession = await createPiSession();
	await world.piSession.assistant("try an alternative approach");
});

When("the Pi assistant outputs {string}", async function (text: string) {
	const world = this as PiWorld;
	assert.ok(
		world.directory && world.homeDirectory,
		"Pi settings are configured",
	);
	world.childResult = await runConfiguredPi(
		world.directory,
		world.homeDirectory,
		text,
	);
});

When("the Pi extension loads", async function () {
	const world = this as PiWorld;
	assert.ok(
		world.directory && world.homeDirectory,
		"Pi settings are configured",
	);
	world.childResult = await runConfiguredPi(
		world.directory,
		world.homeDirectory,
		"allowed",
	);
});

When("new input reaches the Pi session", async function () {
	const session = (this as PiWorld).piSession;
	assert.ok(session, "Pi session is configured");
	await session.input();
});

When("the user runs the Pi {string} command", async function (name: string) {
	const session = (this as PiWorld).piSession;
	assert.ok(session, "Pi session is configured");
	await session.command(name);
});

When(
	"the assistant outputs {string} in a {string} block",
	async function (text: string, block: string) {
		const session = (this as PiWorld).piSession;
		assert.ok(session, "Pi session is configured");
		await session.assistant([{ type: block, [block]: text }]);
	},
);

Then("Pi rejects the next tool call with the TINA message", function () {
	assert.match(
		(this as PiWorld).childResult?.stdout ?? "",
		/TINA: Alternative-seeking detected/,
	);
});

Then("Pi reports the invalid settings file path", function () {
	assert.match(
		(this as PiWorld).childResult?.stderr ?? "",
		/invalid tina\.phrases in settings at .*settings\.json:/,
	);
});

Then("the Pi session permits the next tool call", async function () {
	const session = (this as PiWorld).piSession;
	assert.ok(session, "Pi session is configured");
	assert.equal(await session.toolCall(), undefined);
});

Then(
	"the first tool call is rejected with the TINA message",
	async function () {
		const session = (this as PiWorld).piSession;
		assert.ok(session, "Pi session is configured");
		assert.deepEqual(await session.toolCall(), {
			block: true,
			reason: BLOCK_MESSAGE,
		});
	},
);

Then("the next tool call is rejected with the TINA message", async function () {
	const session = (this as PiWorld).piSession;
	assert.ok(session, "Pi session is configured");
	assert.deepEqual(await session.toolCall(), {
		block: true,
		reason: BLOCK_MESSAGE,
	});
});

export async function createPiSession(): Promise<PiSession> {
	const handlers = new Map<string, (event?: unknown) => Promise<unknown>>();
	const commands = new Map<string, () => Promise<void>>();
	const { default: loadTina } = await import("@dk/pi-tina");

	// @exceptional-double Internal extension wiring has no independent external verifier.
	loadTina({
		on: (event: string, handler: (event?: unknown) => Promise<unknown>) => {
			handlers.set(event, handler);
		},
		registerCommand: (
			name: string,
			command: { handler: () => Promise<void> },
		) => {
			commands.set(name, command.handler);
		},
	} as never);

	return {
		assistant: async (text) => {
			const handler = handlers.get("message_update");
			assert.ok(handler, "Pi message_update handler is registered");
			await handler({
				message: { role: "assistant", content: text },
			});
		},
		toolCall: async () => {
			const handler = handlers.get("tool_call");
			assert.ok(handler, "Pi tool_call handler is registered");
			return (await handler({})) as
				| { block?: boolean; reason?: string }
				| undefined;
		},
		input: async () => {
			const handler = handlers.get("input");
			assert.ok(handler, "Pi input handler is registered");
			await handler({});
		},
		command: async (name) => {
			const handler = commands.get(name);
			assert.ok(handler, `Pi command ${name} is registered`);
			await handler();
		},
	};
}

function runConfiguredPi(
	cwd: string,
	home: string,
	text: string,
): Promise<{ stdout: string; stderr: string; status: number | null }> {
	const script = `
		const handlers = new Map();
		const { default: loadTina } = await import(${JSON.stringify(new URL("../../packages/pi/src/index.ts", import.meta.url).href)});
		loadTina({ on: (event, handler) => handlers.set(event, handler), registerCommand() {} });
		await handlers.get("message_update")({ message: { role: "assistant", content: ${JSON.stringify(text)} } });
		const result = await handlers.get("tool_call")({});
		console.log(JSON.stringify(result));
	`;
	return new Promise((resolveResult, reject) => {
		const child = spawn(
			"node",
			[
				"--import",
				import.meta.resolve("tsx"),
				"--input-type=module",
				"--eval",
				script,
			],
			{
				cwd,
				env: { ...process.env, HOME: home },
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("exit", (status) => resolveResult({ stdout, stderr, status }));
	});
}
