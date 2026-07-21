import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { scanText, setPhrases } from "@dk/tina-core";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let assistantText = "";
let latched = false;

function loadConfig(): void {
	for (const base of [
		resolve(process.cwd(), ".pi"),
		resolve(homedir(), ".pi", "agent"),
	]) {
		const file = resolve(base, "settings.json");
		if (!existsSync(file)) continue;
		try {
			const settings = JSON.parse(readFileSync(file, "utf8"));
			const phrases = settings.tina?.phrases;
			if (Array.isArray(phrases) && phrases.length > 0) {
				setPhrases(phrases.map(String));
				return;
			}
		} catch (e) {
			console.error(`TINA: invalid tina.phrases in settings at ${file}: ${(e as Error).message}`);
		}
	}
}

loadConfig();

/**
 * Pi extension factory. Hooks into message stream and tool calls.
 * @planks-provisional("tina-eval.feature:Pi extension blocks a tool call after assistant says \"try a different approach\"")
 */
export default function (pi: ExtensionAPI) {
	pi.on("message_update", async (event) => {
		if (event.message.role !== "assistant") return;
		assistantText = extractText(event.message);
		if (!latched && scanText(assistantText).matched) {
			latched = true;
		}
	});

	pi.on("input", async () => {
		assistantText = "";
		latched = false;
	});

	pi.on("tool_call", async () => {
		if (latched) {
			return { block: true, reason: BLOCK_MESSAGE };
		}
	});

	pi.registerCommand("tina", {
		description: "Reset TINA block",
		handler: async () => {
			assistantText = "";
			latched = false;
		},
	});
}

function extractText(message: { content?: unknown }): string {
	const content = message.content;
	if (!content) return "";
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block: unknown) => {
				if (typeof block === "string") return block;
				if (
					block &&
					typeof block === "object" &&
					"type" in (block as Record<string, unknown>)
				) {
					const b = block as Record<string, unknown>;
					if (b.type === "text" && typeof b.text === "string") return b.text;
					if (b.type === "thinking" && typeof b.thinking === "string")
						return b.thinking;
				}
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}
	return "";
}
