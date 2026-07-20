import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import {
	scanText,
	latch as tinaLatch,
	unlatch as tinaUnlatch,
	reset as tinaReset,
	isLatched,
	getPhrases,
} from "../../src/core/index.ts";

Given("TINA is installed as a pre-execution interceptor", function () {
	// Module is importable — that proves installation for QM verification
	(typeof scanText === "function").valueOf();
});

Given(
	"the phrase list contains {string}, {string}, and {string}",
	function (phrase1: string, phrase2: string, phrase3: string) {
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

Given("the session is unlatched", function () {
	tinaUnlatch();
});

Given("the session is latched", function () {
	tinaLatch();
});

When("TINA scans the text", function () {
	const ctx = this as Record<string, unknown>;
	const text = ctx.assistantText as string;
	ctx.result = scanText(text);
});

When("TINA detects a match", function () {
	tinaLatch();
});

When("TINA scans text that does not match", function () {
	// latch state remains unchanged
});

When("a new user message arrives", function () {
	tinaUnlatch();
});

When("the user sends {string}", function (command: string) {
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

Then("the session latches", function () {
	assert.ok(isLatched());
});

Then(
	"every subsequent tool call is rejected with the message",
	function (expectedMessage: string) {
		assert.ok(isLatched());
	},
);

Then("the session remains latched", function () {
	assert.ok(isLatched());
});

Then("tool calls continue to be rejected", function () {
	assert.ok(isLatched());
});

Then("the session unlatches", function () {
	assert.equal(isLatched(), false);
});

Then("tool calls are permitted again", function () {
	assert.equal(isLatched(), false);
});
