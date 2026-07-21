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
		} catch {}
	}
	for (const base of [process.cwd(), PLUGIN_ROOT]) {
		const file = resolve(base, ".tina.json");
		if (!existsSync(file)) continue;
		try {
			const cfg = JSON.parse(readFileSync(file, "utf8"));
			if (Array.isArray(cfg.phrases) && cfg.phrases.length > 0) return cfg.phrases.map(String);
		} catch {}
	}
	return DEFAULT_PHRASES;
}

const phrases = loadPhrases();

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
	try {
		const event = JSON.parse(input);
		const text = extractText(event);
		if (text) {
			const lower = text.toLowerCase();
			for (const phrase of phrases) {
				if (lower.includes(phrase.toLowerCase())) {
					console.error(`TINA blocked: phrase "${phrase}" detected`);
					process.exit(1);
				}
			}
		}
		process.exit(0);
	} catch {
		process.exit(0);
	}
});

function extractText(event) {
	if (event.text) return event.text;
	if (event.content) return typeof event.content === "string" ? event.content : JSON.stringify(event.content);
	if (event.toolName === "bash" || event.toolName === "Bash") return event.input?.command;
	if (event.toolName === "read" || event.toolName === "Read") return event.input?.path;
	if (event.toolName === "edit" || event.toolName === "Edit") return event.input?.content;
	if (event.toolName === "write" || event.toolName === "Write") return event.input?.content;
	if (event.input) return JSON.stringify(event.input);
	return "";
}
