import { scanText, setPhrases } from "@dk/tina-core";
import type { Plugin } from "@opencode-ai/plugin";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let blocked = false;

function loadConfig(): void {
	const raw = process.env.TINA_PHRASES;
	if (!raw) return;
	try {
		const phrases = JSON.parse(raw);
		if (Array.isArray(phrases) && phrases.length > 0) {
			setPhrases(phrases.map(String));
		}
	} catch (e) {
		console.error(`TINA: invalid TINA_PHRASES env var: ${(e as Error).message}`);
	}
}

loadConfig();

/**
 * OpenCode plugin factory. Intercepts tool execution and blocks on phrase match.
 * @planks-provisional("tina-opencode.feature:OpenCode plugin blocks tool calls after assistant says a disallowed phrase")
 */
export const TinaPlugin: Plugin = async () => {
	return {
		"message.updated": async (input: unknown) => {
			const msg = input as { role?: string; content?: string } | undefined;
			if (msg?.role !== "assistant") return;
			if (blocked) return;
			if (typeof msg.content === "string" && scanText(msg.content).matched) {
				blocked = true;
			}
		},
		"tool.execute.before": async (_input, _output) => {
			if (blocked) {
				throw new Error(BLOCK_MESSAGE);
			}
		},
	};
};
