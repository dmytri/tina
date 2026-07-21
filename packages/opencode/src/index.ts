import { scanText, setPhrases } from "@dk/tina-core";
import type { Plugin } from "@opencode-ai/plugin";

function loadConfig(): void {
	const raw = process.env.TINA_PHRASES;
	if (!raw) return;
	try {
		const phrases = JSON.parse(raw);
		if (Array.isArray(phrases) && phrases.length > 0) {
			setPhrases(phrases.map(String));
		}
	} catch {
		// ignore
	}
}

loadConfig();

/**
 * OpenCode plugin factory. Intercepts tool execution and blocks on phrase match.
 * @planks-provisional("tina-opencode.feature:OpenCode plugin blocks tool calls after assistant says a disallowed phrase")
 */
export const TinaPlugin: Plugin = async () => {
	return {
		"tool.execute.before": async (input, output) => {
			const tool = input.tool as string;
			const args = output.args as Record<string, unknown>;
			const textToScan = findTextInput(tool, args);
			if (textToScan && scanText(textToScan).matched) {
				throw new Error(
					"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.",
				);
			}
		},
	};
};

function findTextInput(
	tool: string,
	args: Record<string, unknown>,
): string | null {
	if (typeof args.command === "string") return args.command;
	if (typeof args.content === "string") return args.content;
	if (typeof args.text === "string") return args.text;
	return null;
}
