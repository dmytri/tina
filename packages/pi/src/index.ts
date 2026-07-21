import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { isLatched, latch, reset, scanText, setPhrases } from "@dk/tina-core";

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
			// ignore invalid settings
		}
	}
}

loadConfig();

export function piToolCallHook(
	toolName: string,
	input: Record<string, unknown>,
): { block: boolean; reason?: string } {
	if (isLatched()) {
		return { block: true, reason: "Blocked by TINA" };
	}
	if (toolName === "bash" && typeof input.command === "string") {
		const result = scanText(input.command);
		if (result.matched) {
			latch();
			return {
				block: true,
				reason: `Blocked by TINA: phrase "${result.matchedPhrase}" detected`,
			};
		}
	}
	return { block: false };
}

export function tinaReset(): void {
	reset();
}
