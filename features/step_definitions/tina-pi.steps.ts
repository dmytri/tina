import assert from "node:assert/strict";
import { Given, Then } from "@cucumber/cucumber";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

export type PiSession = {
	assistant: (text: string) => Promise<void>;
	toolCall: () => Promise<{ block?: boolean; reason?: string } | undefined>;
};

type PiWorld = {
	piSession?: PiSession;
	piSessions?: Map<string, PiSession>;
};

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
	const { default: loadTina } = await import("@dk/pi-tina");

	// @exceptional-double Internal extension wiring has no independent external verifier.
	loadTina({
		on: (event: string, handler: (event?: unknown) => Promise<unknown>) => {
			handlers.set(event, handler);
		},
		registerCommand: () => {},
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
	};
}
