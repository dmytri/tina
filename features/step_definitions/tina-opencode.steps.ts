import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Given, Then, When } from "@cucumber/cucumber";
import type { PiSession } from "./tina-pi.steps.ts";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

type OpenCodePlugin = Awaited<ReturnType<typeof loadPlugin>>;
type OpenCodeWorld = {
	plugin?: OpenCodePlugin;
	blockError?: Error | null;
	openCodePlugin?: OpenCodePlugin;
	openCodeSessions?: Map<string, OpenCodePlugin>;
	piSession?: PiSession;
	piSessions?: Map<string, PiSession>;
	childResult?: { stdout: string; stderr: string; status: number | null };
	configuredPhrases?: string;
};

async function loadPlugin() {
	const mod = await import("@dk/opencode-tina");
	const hooks = await mod.TinaPlugin({} as never);
	return hooks as {
		event: (input: {
			event: Record<string, unknown>;
		}) => Promise<void>;
		"tool.execute.before": (input: unknown, output: unknown) => Promise<void>;
	};
}

Given("OpenCode is running with the TINA plugin loaded", async function () {
	const world = this as OpenCodeWorld;
	const plugin = await loadPlugin();
	world.plugin = plugin;
	world.openCodePlugin = plugin;
	assert.ok(plugin, "TINA plugin loaded");
	assert.ok(typeof plugin.event === "function");
	assert.ok(typeof plugin["tool.execute.before"] === "function");
});

When(
	"the assistant outputs a disallowed phrase in its response",
	async function () {
		const plugin = (this as OpenCodeWorld).plugin;
		assert.ok(plugin, "TINA plugin loaded");
		// Simulate message.updated to set assistant message context
		await plugin.event({
			event: {
				type: "message.updated",
				properties: {
					info: {
						id: "assistant-msg-1",
						role: "assistant",
					},
				},
			},
		});

		// Simulate message.part.updated with the offending text
		await plugin.event({
			event: {
				type: "message.part.updated",
				properties: {
					part: {
						id: "part-1",
						messageID: "assistant-msg-1",
						type: "text",
						text: "I think we should try an alternative approach here.",
					},
				},
			},
		});
	},
);

When("the assistant then attempts a tool call", async function () {
	const world = this as OpenCodeWorld;
	const plugin = world.plugin;
	world.blockError = null;
	try {
		assert.ok(plugin, "TINA plugin loaded");
		await plugin["tool.execute.before"]({}, {});
	} catch (e) {
		world.blockError = e as Error;
	}
});

Then("the tool call is blocked with the TINA rejection message", function () {
	const blockError = (this as OpenCodeWorld).blockError;
	if (blockError === null) {
		assert.match(
			(this as OpenCodeWorld).childResult?.stdout ?? "",
			/TINA: Alternative-seeking detected/,
		);
		return;
	}
	assert.ok(blockError, "expected tool call to be blocked");
	assert.equal(blockError.message, BLOCK_MESSAGE);
});

Then("the assistant can execute a tool call", async function () {
	const selected = (this as OpenCodeWorld).openCodePlugin;
	assert.ok(selected, "OpenCode plugin is configured");
	await selected["tool.execute.before"]({}, {});
});

Given(
	"OpenCode sessions {string} and {string} use the TINA plugin",
	async function (first: string, second: string) {
		(this as OpenCodeWorld).openCodeSessions = new Map([
			[first, await loadPlugin()],
			[second, await loadPlugin()],
		]);
	},
);

Given(
	"one OpenCode plugin instance handles sessions {string} and {string}",
	async function (first: string, second: string) {
		const plugin = await loadPlugin();
		(this as OpenCodeWorld).openCodeSessions = new Map([
			[first, plugin],
			[second, plugin],
		]);
	},
);

Given(
	"one OpenCode plugin instance handles session {string}",
	async function (session: string) {
		(this as OpenCodeWorld).openCodeSessions = new Map([
			[session, await loadPlugin()],
		]);
	},
);

When(
	"the assistant in session {string} outputs {string}",
	async function (session: string, text: string) {
		const pi = (this as OpenCodeWorld).piSessions?.get(session);
		if (pi) {
			await pi.assistant(text);
			return;
		}
		await sendAssistantText(sessionPlugin(this, session), session, text);
	},
);

Then("session {string} rejects a tool call", async function (session: string) {
	const pi = (this as OpenCodeWorld).piSessions?.get(session);
	if (pi) {
		assert.equal((await pi.toolCall())?.block, true);
		return;
	}
	await assert.rejects(
		sessionPlugin(this, session)["tool.execute.before"](
			{ sessionID: session },
			{},
		),
		{ message: BLOCK_MESSAGE },
	);
});

Then("session {string} permits a tool call", async function (session: string) {
	const pi = (this as OpenCodeWorld).piSessions?.get(session);
	if (pi) {
		assert.equal(await pi.toolCall(), undefined);
		return;
	}
	await sessionPlugin(this, session)["tool.execute.before"](
		{ sessionID: session },
		{},
	);
});

Given("OpenCode session {string} is latched", async function (session: string) {
	const world = this as OpenCodeWorld;
	world.openCodeSessions ??= new Map();
	const sessions = world.openCodeSessions;
	const selected = sessions.get(session) ?? (await loadPlugin());
	sessions.set(session, selected);
	await sendAssistantText(selected, session, "try an alternative approach");
});

Given("{string} configures {string}", function (name: string, phrase: string) {
	assert.equal(name, "TINA_PHRASES");
	const world = this as OpenCodeWorld;
	world.childResult = undefined;
	world.configuredPhrases = JSON.stringify([phrase]);
});

Given("{string} contains invalid JSON", function (name: string) {
	assert.equal(name, "TINA_PHRASES");
	(this as OpenCodeWorld).configuredPhrases = "{";
});

When("the OpenCode assistant outputs {string}", async function (text: string) {
	const world = this as OpenCodeWorld;
	world.childResult = await runOpenCode(text, world.configuredPhrases);
	world.blockError = null;
});

When("the OpenCode plugin loads", async function () {
	const world = this as OpenCodeWorld;
	world.childResult = await runOpenCode("allowed", world.configuredPhrases);
});

When("reasoning output contains {string}", async function (text: string) {
	const world = this as OpenCodeWorld;
	const plugin = world.plugin;
	assert.ok(plugin, "TINA plugin loaded");
	await plugin.event({
		event: {
			type: "message.updated",
			properties: { info: { id: "reasoning-message", role: "assistant" } },
		},
	});
	await plugin.event({
		event: {
			type: "message.part.updated",
			properties: {
				part: { messageID: "reasoning-message", type: "reasoning", text },
			},
		},
	});
	world.blockError = null;
	try {
		await plugin["tool.execute.before"]({}, {});
	} catch (error) {
		world.blockError = error as Error;
	}
});

Then("OpenCode reports that {string} is invalid", function (name: string) {
	assert.match(
		(this as OpenCodeWorld).childResult?.stderr ?? "",
		new RegExp(`invalid ${name}`),
	);
});

Given(
	"OpenCode session {string} is unlatched",
	async function (session: string) {
		const world = this as OpenCodeWorld;
		world.openCodeSessions ??= new Map();
		if (!world.openCodeSessions.has(session)) {
			world.openCodeSessions.set(session, await loadPlugin());
		}
	},
);

When(
	"the user sends a message in session {string}",
	async function (session: string) {
		await sessionPlugin(this, session).event({
			event: {
				type: "message.updated",
				properties: {
					info: { id: `user-${session}`, role: "user", sessionID: session },
				},
			},
		});
	},
);

When("OpenCode deletes session {string}", async function (session: string) {
	await sessionPlugin(this, session).event({
		event: {
			type: "session.deleted",
			properties: { info: { id: session } },
		},
	});
});

Then("session {string} remains latched", async function (session: string) {
	await assert.rejects(
		sessionPlugin(this, session)["tool.execute.before"](
			{ sessionID: session },
			{},
		),
		{ message: BLOCK_MESSAGE },
	);
});

function sessionPlugin(world: unknown, session: string): OpenCodePlugin {
	const selected = (world as OpenCodeWorld).openCodeSessions?.get(session);
	assert.ok(selected, `OpenCode session ${session} is configured`);
	return selected;
}

async function sendAssistantText(
	selected: OpenCodePlugin,
	session: string,
	text: string,
): Promise<void> {
	const messageID = `assistant-${session}`;
	await selected.event({
		event: {
			type: "message.updated",
			properties: {
				info: { id: messageID, role: "assistant", sessionID: session },
			},
		},
	});
	await selected.event({
		event: {
			type: "message.part.updated",
			properties: {
				part: {
					id: `part-${session}`,
					messageID,
					sessionID: session,
					type: "text",
					text,
				},
			},
		},
	});
}

function runOpenCode(
	text: string,
	phrases: string | undefined,
): Promise<{ stdout: string; stderr: string; status: number | null }> {
	const script = `
		const { TinaPlugin } = await import("./packages/opencode/src/index.ts");
		const plugin = await TinaPlugin({});
		await plugin.event({ event: { type: "message.updated", properties: { info: { id: "m", role: "assistant" } } } });
		await plugin.event({ event: { type: "message.part.updated", properties: { part: { messageID: "m", type: "text", text: ${JSON.stringify(text)} } } } });
		try { await plugin["tool.execute.before"]({}, {}); console.log("permitted"); }
		catch (error) { console.log(error.message); }
	`;
	return runNode(
		script,
		phrases === undefined
			? process.env
			: { ...process.env, TINA_PHRASES: phrases },
	);
}

function runNode(
	script: string,
	env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string; status: number | null }> {
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
			{ env, stdio: ["ignore", "pipe", "pipe"] },
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
