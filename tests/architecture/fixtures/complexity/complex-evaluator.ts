/** Intentional example of an evaluator with cyclomatic complexity 12 (it must be flagged). */
interface Card { rank: number; suit: string; isJoker: boolean }

function containsWrap(cards: Card[]): boolean {
	return cards.some((c) => c.rank === 1) && cards.some((c) => c.rank === 13);
}

export function isValidMeld(cards: Card[], withWrap: boolean, jokersEnabled: boolean): boolean {
	if (cards.length < 3 || cards.length > 4) return false;
	let jokers = 0;
	let sameRank = true;
	let sameSuit = true;
	for (const c of cards) {
		if (c.isJoker) {
			jokers++;
			continue;
		}
		if (c.rank !== cards[0].rank) sameRank = false;
		if (c.suit !== cards[0].suit) sameSuit = false;
	}
	if (jokers > 1 && jokersEnabled) return false;
	if (sameRank) return true;
	if (!sameSuit) return false;
	return withWrap ? true : !containsWrap(cards);
}
