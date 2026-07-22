#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_PHRASES = [
	"try a different approach",
	"try an alternative approach",
	"try an alternate approach",
];

function loadPhrases() {
	const env = process.env.TINA_PHRASES;
	if (env) {
		try {
			const parsed = JSON.parse(env);
			if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
		} catch (e) {
			console.error(`TINA: invalid TINA_PHRASES env var: ${e.message}`);
		}
	}
	for (const base of [process.cwd(), PLUGIN_ROOT]) {
		const file = resolve(base, ".tina.json");
		if (!existsSync(file)) continue;
		try {
			const cfg = JSON.parse(readFileSync(file, "utf8"));
			if (Array.isArray(cfg.phrases) && cfg.phrases.length > 0) return cfg.phrases.map(String);
		} catch (e) {
			console.error(`TINA: invalid .tina.json at ${file}: ${e.message}`);
		}
	}
	return DEFAULT_PHRASES;
}

const phrases = loadPhrases();

const TRANSCRIPT_STATE_FILE = resolve(PLUGIN_ROOT, ".tina-state.json");

function saveState(turnId) {
	try {
		writeFileSync(TRANSCRIPT_STATE_FILE, JSON.stringify({ turnId }));
	} catch {}
}

function loadState() {
	try {
		return JSON.parse(readFileSync(TRANSCRIPT_STATE_FILE, "utf8")).turnId;
	} catch {
		return null;
	}
}

function block(reason) {
	const out = {
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: reason,
		},
	};
	console.log(JSON.stringify(out));
	process.exit(0);
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
	try {
		const event = JSON.parse(input);
		const transcriptPath = event.conversation_transcript_path || event.transcript_path;

		// Without a conversation transcript, we cannot observe assistant text.
		// Scanning tool arguments would produce false positives (command text)
		// and miss the real case (assistant saying the phrase). Allow the call.
		if (!transcriptPath || !existsSync(transcriptPath)) {
			process.exit(0);
		}

		// Parse JSONL transcript: one JSON object per line
		const raw = readFileSync(transcriptPath, "utf8");
		const lines = raw.split("\n").filter(Boolean);
		const messages = lines
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		// Find the most recent user prompt
		let lastUserIdx = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.role === "user" || msg.type === "user_prompt") {
				lastUserIdx = i;
				break;
			}
		}

		// Skip if we already scanned this turn
		const previousTurn = loadState();
		const currentTurn =
			lastUserIdx >= 0
				? messages[lastUserIdx].id || String(lastUserIdx)
				: null;

		if (currentTurn !== null && currentTurn === previousTurn) {
			process.exit(0);
		}
		saveState(currentTurn);

		// Scan every assistant text block after the last user prompt
		for (let i = lastUserIdx + 1; i < messages.length; i++) {
			const msg = messages[i];
			if (msg.role === "assistant" || msg.type === "assistant") {
				const text = extractContent(msg);
				if (text) {
					const lower = text.toLowerCase();
					for (const phrase of phrases) {
						if (lower.includes(phrase.toLowerCase())) {
							block(`TINA blocked: phrase "${phrase}" detected`);
							return;
						}
					}
				}
			}
		}

		process.exit(0);
	} catch {
		process.exit(0);
	}
});

function extractContent(msg) {
	if (typeof msg.content === "string") return msg.content;
	if (typeof msg.text === "string") return msg.text;
	if (Array.isArray(msg.content)) {
		return msg.content
			.map((block) => {
				if (typeof block === "string") return block;
				if (block.type === "text" && block.text) return block.text;
				if (block.type === "thinking" && block.thinking) return block.thinking;
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}
	return "";
}
