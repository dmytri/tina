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

/** @planks("custom phrases are configured via setPhrases") */
export function setPhrases(phrases: string[]): void {
	PHRASES = phrases;
}

/** @planks("resetPhrases restores the default list") */
export function resetPhrases(): void {
	PHRASES = [...DEFAULT_PHRASES];
}

/** @planks("the phrase list contains {string}, {string}, and {string}") */
export function getPhrases(): readonly string[] {
	return [...PHRASES];
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
