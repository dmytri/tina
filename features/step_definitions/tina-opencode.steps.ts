import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { scanText, setPhrases } from "@dk/tina-core";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let plugin: Awaited<ReturnType<typeof createPlugin>> | null = null;
let blockError: Error | null = null;

async function createPlugin() {
	const mod = await import("@dk/opencode-tina");
	const hooks = await mod.TinaPlugin();
	return hooks as {
		"message.updated": (input: unknown) => void | Promise<void>;
		"tool.execute.before": (
			input: unknown,
			output: unknown,
		) => void | Promise<void>;
	};
}

Given("OpenCode is running with the TINA plugin loaded", async () => {
	plugin = await createPlugin();
	assert.ok(plugin, "TINA plugin loaded");
	assert.ok(typeof plugin["message.updated"] === "function");
	assert.ok(typeof plugin["tool.execute.before"] === "function");
});

When("the assistant outputs a disallowed phrase in its response", async () => {
	await plugin!["message.updated"]({
		role: "assistant",
		content: "I think we should try an alternative approach here.",
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
