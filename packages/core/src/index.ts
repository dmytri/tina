export interface ScanResult {
	matched: boolean;
	matchedPhrase?: string;
}

const DEFAULT_PHRASES: string[] = [
	"try a different approach",
	"try an alternative approach",
	"try an alternate approach",
];

let PHRASES: string[] = [...DEFAULT_PHRASES];
let latched = false;

export function setPhrases(phrases: string[]): void {
	PHRASES = phrases;
}

export function resetPhrases(): void {
	PHRASES = [...DEFAULT_PHRASES];
}

/**
 * Scans assistant text for known disallowed phrases.
 * @planks("TINA scans the text")
 */
export function scanText(text: string): ScanResult {
	for (const phrase of PHRASES) {
		if (text.toLowerCase().includes(phrase.toLowerCase())) {
			return { matched: true, matchedPhrase: phrase };
		}
	}
	return { matched: false };
}

/**
 * Reports whether the session is currently latched.
 */
export function isLatched(): boolean {
	return latched;
}

/**
 * Engages the session latch, blocking tool calls.
 * @planks("TINA detects a match")
 * @planks("the session is latched")
 */
export function latch(): void {
	latched = true;
}

/**
 * Disengages the session latch, restoring tool access.
 * @planks("the session is unlatched")
 * @planks("a new user message arrives")
 */
export function unlatch(): void {
	latched = false;
}

/**
 * Resets the session latch state.
 * @planks("the user sends {string}")
 */
export function reset(): void {
	latched = false;
}

/**
 * Returns the current phrase list.
 * @planks("the phrase list contains {string}, {string}, and {string}")
 */
export function getPhrases(): readonly string[] {
	return PHRASES;
}
