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

export function setPhrases(phrases: string[]): void {
	PHRASES = phrases;
}

export function resetPhrases(): void {
	PHRASES = [...DEFAULT_PHRASES];
}

export function getPhrases(): readonly string[] {
	return [...PHRASES];
}

export function scanText(text: string): ScanResult {
	for (const phrase of PHRASES) {
		if (text.toLowerCase().includes(phrase.toLowerCase())) {
			return { matched: true, matchedPhrase: phrase };
		}
	}
	return { matched: false };
}
