import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { PiSession } from "./tina-pi.steps.ts";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let plugin: Awaited<ReturnType<typeof loadPlugin>> | null = null;
let blockError: Error | null = null;

type OpenCodePlugin = Awaited<ReturnType<typeof loadPlugin>>;
type OpenCodeWorld = {
	openCodePlugin?: OpenCodePlugin;
	openCodeSessions?: Map<string, OpenCodePlugin>;
	piSession?: PiSession;
	piSessions?: Map<string, PiSession>;
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
	plugin = await loadPlugin();
	(this as OpenCodeWorld).openCodePlugin = plugin;
	assert.ok(plugin, "TINA plugin loaded");
	assert.ok(typeof plugin.event === "function");
	assert.ok(typeof plugin["tool.execute.before"] === "function");
});

When("the assistant outputs a disallowed phrase in its response", async () => {
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
});

When("the assistant then attempts a tool call", async () => {
	blockError = null;
	try {
		assert.ok(plugin, "TINA plugin loaded");
		await plugin["tool.execute.before"]({}, {});
	} catch (e) {
		blockError = e as Error;
	}
});

Then("the tool call is blocked with the TINA rejection message", () => {
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
		sessionPlugin(this, session)["tool.execute.before"]({}, {}),
		{ message: BLOCK_MESSAGE },
	);
});

Then("session {string} permits a tool call", async function (session: string) {
	const pi = (this as OpenCodeWorld).piSessions?.get(session);
	if (pi) {
		assert.equal(await pi.toolCall(), undefined);
		return;
	}
	await sessionPlugin(this, session)["tool.execute.before"]({}, {});
});

Given("OpenCode session {string} is latched", async function (session: string) {
	const world = this as OpenCodeWorld;
	world.openCodeSessions ??= new Map();
	const sessions = world.openCodeSessions;
	const selected = await loadPlugin();
	sessions.set(session, selected);
	await sendAssistantText(selected, session, "try an alternative approach");
});

Given(
	"OpenCode session {string} is unlatched",
	async function (session: string) {
		const world = this as OpenCodeWorld;
		world.openCodeSessions ??= new Map();
		world.openCodeSessions.set(session, await loadPlugin());
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

Then("session {string} remains latched", async function (session: string) {
	await assert.rejects(
		sessionPlugin(this, session)["tool.execute.before"]({}, {}),
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
