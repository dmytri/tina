import { scanText, setPhrases } from "@dk/tina-core";
import type { Plugin } from "@opencode-ai/plugin";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

/**
 * @planks("the OpenCode assistant outputs {string}")
 * @planks("the OpenCode plugin loads")
 */
function loadConfig(): void {
	const raw = process.env.TINA_PHRASES;
	if (!raw) return;
	try {
		const phrases = JSON.parse(raw);
		if (Array.isArray(phrases) && phrases.length > 0) {
			setPhrases(phrases.map(String));
		}
	} catch (e) {
		console.error(
			`TINA: invalid TINA_PHRASES env var: ${(e as Error).message}`,
		);
	}
}

loadConfig();

/**
 * OpenCode plugin factory. Intercepts tool execution and blocks on phrase match.
 * @planks("the tool call is blocked with the TINA rejection message")
 * @planks("the assistant can execute a tool call")
 * @planks("session {string} rejects a tool call")
 * @planks("session {string} permits a tool call")
 * @planks("session {string} remains latched")
 * @planks("reasoning output contains {string}")
 */
export const TinaPlugin: Plugin = async () => {
	let blocked = false;
	let currentAssistantMessageID: string | null = null;

	return {
		event: async ({ event }) => {
			if (event.type === "message.updated") {
				const info = (event.properties as Record<string, unknown>)
					.info as Record<string, unknown>;
				if (info.role === "user") {
					blocked = false;
					currentAssistantMessageID = null;
				} else if (info.role === "assistant") {
					currentAssistantMessageID = info.id as string;
				}
			}

			if (blocked) return;

			if (event.type === "message.part.updated") {
				const props = event.properties as {
					part?: Record<string, unknown>;
				};
				const part = props.part;
				if (!part) return;

				if (
					!currentAssistantMessageID ||
					part.messageID !== currentAssistantMessageID
				)
					return;

				if (part.type === "text" && typeof part.text === "string") {
					if (scanText(part.text).matched) blocked = true;
				} else if (part.type === "reasoning" && typeof part.text === "string") {
					if (scanText(part.text).matched) blocked = true;
				}
			}
		},
		"tool.execute.before": async () => {
			if (blocked) {
				throw new Error(BLOCK_MESSAGE);
			}
		},
	};
};
