export interface ScanResult {
	matched: boolean;
	matchedPhrase?: string;
}

const PHRASES: string[] = [
	"alternative approach",
	"alternate approach",
	"alternatively",
];

let latched = false;

export function scanText(text: string): ScanResult {
	for (const phrase of PHRASES) {
		if (text.toLowerCase().includes(phrase.toLowerCase())) {
			return { matched: true, matchedPhrase: phrase };
		}
	}
	return { matched: false };
}

export function isLatched(): boolean {
	return latched;
}

export function latch(): void {
	latched = true;
}

export function unlatch(): void {
	latched = false;
}

export function reset(): void {
	latched = false;
}

export function getPhrases(): readonly string[] {
	return PHRASES;
}
