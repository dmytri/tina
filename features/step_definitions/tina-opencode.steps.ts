import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let plugin: Awaited<ReturnType<typeof loadPlugin>> | null = null;
let blockError: Error | null = null;

async function loadPlugin() {
	const mod = await import("@dk/opencode-tina");
	const hooks = await mod.TinaPlugin();
	return hooks as {
		event: (input: {
			event: Record<string, unknown>;
		}) => Promise<void>;
		"tool.execute.before": (
			input: unknown,
			output: unknown,
		) => Promise<void>;
	};
}

Given("OpenCode is running with the TINA plugin loaded", async () => {
	plugin = await loadPlugin();
	assert.ok(plugin, "TINA plugin loaded");
	assert.ok(typeof plugin.event === "function");
	assert.ok(typeof plugin["tool.execute.before"] === "function");
});

When("the assistant outputs a disallowed phrase in its response", async () => {
	// Simulate message.updated to set assistant message context
	await plugin!.event({
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
	await plugin!.event({
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
		await plugin!["tool.execute.before"]({}, {});
	} catch (e) {
		blockError = e as Error;
	}
});

Then("the tool call is blocked with the TINA rejection message", () => {
	assert.ok(blockError, "expected tool call to be blocked");
	assert.equal(blockError!.message, BLOCK_MESSAGE);
});
