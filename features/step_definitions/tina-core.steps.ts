import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { getPhrases, resetPhrases, scanText, setPhrases } from "@dk/tina-core";

const DEFAULT = ["try a different approach", "try an alternative approach", "try an alternate approach"];
const CUSTOM = ["never say this", "avoid that phrase"];

Given("the default phrase list is active", () => {
	resetPhrases();
	const phrases = getPhrases();
	for (const p of DEFAULT) {
		assert.ok(phrases.includes(p), `default phrase "${p}" missing`);
	}
});

When("custom phrases are configured via setPhrases", () => {
	setPhrases(CUSTOM);
	assert.deepEqual([...getPhrases()], CUSTOM);
});

Then(
	"scanText matches a custom phrase but not an original default phrase",
	() => {
		assert.ok(scanText("never say this").matched);
		assert.equal(
			scanText("try a different approach").matched,
			false,
			"original default should not match after custom config",
		);
	},
);

Then("resetPhrases restores the default list", () => {
	resetPhrases();
	const phrases = getPhrases();
	for (const p of DEFAULT) {
		assert.ok(phrases.includes(p), `default phrase "${p}" missing after reset`);
	}
	assert.equal(phrases.length, DEFAULT.length);
});
