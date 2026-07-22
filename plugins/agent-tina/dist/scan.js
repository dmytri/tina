#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_PHRASES = [
	"try a different approach",
	"try an alternative approach",
	"try an alternate approach",
];

/**
 * @planks("another tool call reaches the PreToolUse hook")
 * @planks("the Claude Code hook loads")
 */
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
			if (Array.isArray(cfg.phrases) && cfg.phrases.length > 0)
				return cfg.phrases.map(String);
		} catch (e) {
			console.error(`TINA: invalid .tina.json at ${file}: ${e.message}`);
		}
	}
	return DEFAULT_PHRASES;
}

const phrases = loadPhrases();

/** @planks("the hook denies the tool call with the TINA rejection message") */
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

/**
 * @planks("the hook warns that TINA is inactive because the transcript is unavailable")
 * @planks("the hook warns that TINA is inactive because the transcript record is malformed")
 */
function warnInactive(reason) {
	console.error(`TINA inactive: transcript ${reason}`);
}

let input = "";
process.stdin.on("data", (chunk) => {
	input += chunk;
});
process.stdin.on("end", () => {
	try {
		const event = JSON.parse(input);
		const transcriptPath =
			event.conversation_transcript_path || event.transcript_path;

		if (!transcriptPath || !existsSync(transcriptPath)) {
			warnInactive("unavailable");
			process.exit(0);
		}

		const raw = readFileSync(transcriptPath, "utf8");
		let malformed = false;
		const records = raw
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					malformed = true;
					return null;
				}
			})
			.filter(Boolean);
		if (malformed) {
			warnInactive("malformed");
			process.exit(0);
		}

		let lastUserIdx = -1;
		for (let i = records.length - 1; i >= 0; i--) {
			const r = records[i];
			if (isHumanPrompt(r)) {
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

/**
 * @planks("the hook denies the tool call with the TINA rejection message")
 * @planks("the hook permits the tool call")
 */
function isHumanPrompt(record) {
	const content = record.message?.content;
	if (
		Array.isArray(content) &&
		content.length > 0 &&
		content.every((block) => block?.type === "tool_result")
	) {
		return false;
	}
	return (
		record.type === "user" ||
		record.type === "user_prompt" ||
		record.message?.role === "user"
	);
}

/**
 * @planks("the hook denies the tool call with the TINA rejection message")
 * @planks("another tool call reaches the PreToolUse hook")
 */
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
