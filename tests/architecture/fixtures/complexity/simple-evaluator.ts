/** Example of an atomic evaluator (low CC): one responsibility per function. */
interface Card { rank: number; suit: string }

export function sameRank(cards: Card[]): boolean {
	return cards.every((c) => c.rank === cards[0].rank);
}

export function sameSuit(cards: Card[]): boolean {
	return cards.every((c) => c.suit === cards[0].suit);
}
