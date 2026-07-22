#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
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

		if (!transcriptPath || !existsSync(transcriptPath)) {
			process.exit(0);
		}

		const raw = readFileSync(transcriptPath, "utf8");
		const records = raw
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		let lastUserIdx = -1;
		for (let i = records.length - 1; i >= 0; i--) {
			const r = records[i];
			if (r.type === "user" || r.type === "user_prompt" || r.message?.role === "user") {
				lastUserIdx = i;
				break;
			}
		}

		for (let i = lastUserIdx + 1; i < records.length; i++) {
			const r = records[i];
			if (r.type !== "assistant" && r.message?.role !== "assistant") continue;
			const text = extractContent(r.message || r);
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
