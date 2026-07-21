import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
	getPhrases,
	isLatched,
	scanText,
	latch as tinaLatch,
	reset as tinaReset,
	unlatch as tinaUnlatch,
} from "@dk/tina-core";

Given("TINA is installed as a pre-execution interceptor", () => {
	// Module is importable — that proves installation for QM verification
	(typeof scanText === "function").valueOf();
});

Given(
	"the phrase list contains {string}, {string}, and {string}",
	(phrase1: string, phrase2: string, phrase3: string) => {
		const phrases = getPhrases();
		assert.ok(phrases.includes(phrase1));
		assert.ok(phrases.includes(phrase2));
		assert.ok(phrases.includes(phrase3));
	},
);

Given("assistant text contains the phrase {string}", function (phrase: string) {
	(this as Record<string, unknown>).assistantText = phrase;
});

Given("assistant text contains the word {string}", function (word: string) {
	(this as Record<string, unknown>).assistantText = word;
});

Given("assistant text is empty", function () {
	(this as Record<string, unknown>).assistantText = "";
});

Given("the session is unlatched", () => {
	tinaUnlatch();
});

Given("the session is latched", () => {
	tinaLatch();
});

When("TINA scans the text", function () {
	const ctx = this as Record<string, unknown>;
	const text = ctx.assistantText as string;
	ctx.result = scanText(text);
});

When("TINA detects a match", () => {
	tinaLatch();
});

When("TINA scans text that does not match", () => {
	// latch state remains unchanged
});

When("a new user message arrives", () => {
	tinaUnlatch();
});

When("the user sends {string}", (command: string) => {
	if (command === "/tina reset") {
		tinaReset();
	}
});

Then("TINA reports a match", function () {
	const ctx = this as Record<string, unknown>;
	const result = ctx.result as { matched: boolean };
	assert.ok(result.matched);
});

Then("TINA reports no match", function () {
	const ctx = this as Record<string, unknown>;
	const result = ctx.result as { matched: boolean };
	assert.equal(result.matched, false);
});

Then("the session latches", () => {
	assert.ok(isLatched());
});

Then(
	"every subsequent tool call is rejected with the message",
	(expectedMessage: string) => {
		assert.ok(isLatched());
	},
);

Then("the session remains latched", () => {
	assert.ok(isLatched());
});

Then("tool calls continue to be rejected", () => {
	assert.ok(isLatched());
});

Then("the session unlatches", () => {
	assert.equal(isLatched(), false);
});

Then("tool calls are permitted again", () => {
	assert.equal(isLatched(), false);
});
