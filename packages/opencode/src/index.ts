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
 * @planks("the user sends a message in session {string}")
 * @planks("OpenCode deletes session {string}")
 * @planks("reasoning output contains {string}")
 */
export const TinaPlugin: Plugin = async () => {
	const sessions = new Map<
		string | undefined,
		{ blocked: boolean; currentAssistantMessageID: string | null }
	>();

	return {
		event: async ({ event }) => {
			if (event.type === "message.updated") {
				const info = (event.properties as Record<string, unknown>)
					.info as Record<string, unknown>;
				const sessionID = info.sessionID as string | undefined;
				const state = sessions.get(sessionID) ?? {
					blocked: false,
					currentAssistantMessageID: null,
				};
				if (info.role === "user") {
					state.blocked = false;
					state.currentAssistantMessageID = null;
				} else if (info.role === "assistant") {
					state.currentAssistantMessageID = info.id as string;
				}
				sessions.set(sessionID, state);
			}

			if (event.type === "session.deleted") {
				sessions.delete(event.properties.info.id);
				return;
			}

			if (event.type === "message.part.updated") {
				const props = event.properties as {
					part?: Record<string, unknown>;
				};
				const part = props.part;
				if (!part) return;
				const state = sessions.get(part.sessionID as string | undefined);
				if (!state || state.blocked) return;

				if (
					!state.currentAssistantMessageID ||
					part.messageID !== state.currentAssistantMessageID
				)
					return;

				if (part.type === "text" && typeof part.text === "string") {
					if (scanText(part.text).matched) state.blocked = true;
				} else if (part.type === "reasoning" && typeof part.text === "string") {
					if (scanText(part.text).matched) state.blocked = true;
				}
			}
		},
		"tool.execute.before": async ({ sessionID }) => {
			if (sessions.get(sessionID)?.blocked) {
				throw new Error(BLOCK_MESSAGE);
			}
		},
	};
};
