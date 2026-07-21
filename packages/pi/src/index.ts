import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { scanText, setPhrases } from "@dk/tina-core";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BLOCK_MESSAGE = "TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let blocked = false;

function loadConfig(): void {
	for (const base of [resolve(process.cwd(), ".pi"), resolve(homedir(), ".pi", "agent")]) {
		const file = resolve(base, "settings.json");
		if (!existsSync(file)) continue;
		try {
			const settings = JSON.parse(readFileSync(file, "utf8"));
			const phrases = settings.tina?.phrases;
			if (Array.isArray(phrases) && phrases.length > 0) {
				setPhrases(phrases.map(String));
				return;
			}
		} catch {
			// ignore
		}
	}
}

loadConfig();

export default function (pi: ExtensionAPI) {
	pi.on("message_end", async (event) => {
		if (event.message.role !== "assistant") return;
		const text = extractAssistantText(event.message);
		if (text && scanText(text).matched) {
			blocked = true;
		}
	});

	pi.on("input", async () => {
		blocked = false;
	});

	pi.on("tool_call", async () => {
		if (!blocked) return;
		return { block: true, reason: BLOCK_MESSAGE };
	});

	pi.registerCommand("tina", {
		description: "Reset TINA latch",
		handler: async () => {
			blocked = false;
		},
	});
}

function extractAssistantText(message: { content?: unknown }): string {
	const content = message.content;
	if (!content) return "";
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				if (typeof block === "string") return block;
				if (block && typeof block === "object" && "type" in block) {
					if (block.type === "text" && typeof (block as { text: string }).text === "string") {
						return (block as { text: string }).text;
					}
				}
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}
	return "";
}
