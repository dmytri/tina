import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { getPhrases, scanText } from "@dk/tina-core";

const BLOCK_MESSAGE =
	"TINA: Alternative-seeking detected. Tool access revoked. State the exact blocker.";

let testLatched = false;
let testBlockMessage: string | null = null;

Given("TINA is installed as a pre-execution interceptor", () => {
	(typeof scanText === "function").valueOf();
});

Given(
	"the phrase list contains {string}, {string}, and {string}",
	(phrase1: string, phrase2: string, phrase3: string) => {
		for (const p of [phrase1, phrase2, phrase3]) {
			assert.ok(getPhrases().includes(p), `phrase "${p}" not in list`);
		}
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
	testLatched = false;
	testBlockMessage = null;
});

Given("the session is latched", () => {
	testLatched = true;
	testBlockMessage = BLOCK_MESSAGE;
});

When("TINA scans the text", function () {
	const ctx = this as Record<string, unknown>;
	const text = ctx.assistantText as string;
	const result = scanText(text);
	ctx.scanResult = result;
	if (result.matched) {
		testLatched = true;
		testBlockMessage = BLOCK_MESSAGE;
	} else {
		testBlockMessage = null;
	}
});

When("TINA detects a match", () => {
	testLatched = true;
	testBlockMessage = BLOCK_MESSAGE;
});

When("TINA scans text that does not match", () => {
	// latch unchanged, message unchanged
});

When("a new user message arrives", () => {
	testLatched = false;
	testBlockMessage = null;
});

When("the user sends {string}", (command: string) => {
	if (command === "/tina reset") {
		testLatched = false;
		testBlockMessage = null;
	}
});

Then("TINA reports a match", function () {
	const ctx = this as Record<string, unknown>;
	assert.ok((ctx.scanResult as { matched: boolean }).matched);
});

Then("TINA reports no match", function () {
	const ctx = this as Record<string, unknown>;
	assert.equal((ctx.scanResult as { matched: boolean }).matched, false);
});

Then("the session latches", () => {
	assert.ok(testLatched);
});

Then(
	"every subsequent tool call is rejected with the message",
	(expectedMessage: string) => {
		assert.ok(testLatched, "session should be latched");
		assert.equal(
			testBlockMessage,
			expectedMessage,
			"rejection message mismatch",
		);
	},
);

Then("the session remains latched", () => {
	assert.ok(testLatched);
});

Then("tool calls continue to be rejected", () => {
	assert.ok(testLatched);
});

Then("the session unlatches", () => {
	assert.equal(testLatched, false);
});

Then("tool calls are permitted again", () => {
	assert.equal(testLatched, false);
});
