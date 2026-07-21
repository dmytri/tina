import { isLatched, latch, reset, scanText, setPhrases } from "@dk/tina-core";

function loadConfig(): void {
	const raw = process.env.TINA_PHRASES;
	if (!raw) return;
	try {
		const phrases = JSON.parse(raw);
		if (Array.isArray(phrases) && phrases.length > 0) {
			setPhrases(phrases.map(String));
		}
	} catch {
		// ignore invalid env
	}
}

loadConfig();

export function opencodeToolBeforeHook(
	tool: string,
	args: Record<string, unknown>,
): void {
	if (isLatched()) {
		throw new Error("Blocked by TINA");
	}
	if (tool === "bash" && typeof args.command === "string") {
		const result = scanText(args.command);
		if (result.matched) {
			latch();
			throw new Error(
				`Blocked by TINA: phrase "${result.matchedPhrase}" detected`,
			);
		}
	}
}

export function tinaReset(): void {
	reset();
}
