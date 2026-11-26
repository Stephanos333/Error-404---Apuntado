import {describe, expect, it} from 'vitest';
import {CardRank, CardSuit, MatchCard} from '../../types/match.type.ts';
import {
    cardImage,
    closeBody,
    closeShape,
    compareVersion,
    discardBody,
    drawBody,
    generateCommandId,
    InvalidIntentError,
    leftoversOf,
    meldKind,
    points,
    reconcileGroups,
    shouldRefresh,
    sortCards,
    unmatchedCards,
} from './match.utils.ts';

const c = (value: CardRank, suit: CardSuit, deckNumber = 1): MatchCard => ({rank: value, suit, deckNumber});

/** 11-card hand: four sevens, three kings, a run of hearts and 1 loose card. */
const FOUR = [c('SEVEN', 'SPADES'), c('SEVEN', 'HEARTS'), c('SEVEN', 'CLUBS'), c('SEVEN', 'DIAMONDS')];
const THREE = [c('K', 'SPADES'), c('K', 'HEARTS'), c('K', 'CLUBS')];
const RUN = [c('TWO', 'HEARTS'), c('THREE', 'HEARTS'), c('FOUR', 'HEARTS')];
const DISCARD = c('NINE', 'DIAMONDS');
const HAND = [DISCARD, ...RUN, ...FOUR, ...THREE];

describe('generateCommandId', () => {
    it('generates distinct UUID v4 values', () => {
        const a = generateCommandId();
        expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(generateCommandId()).not.toBe(a);
    });
});

describe('translating intents into the backend contract', () => {
    it('draw: the source is sent as DISCARD_PILE or DECK', () => {
        expect(drawBody({source: 'DISCARD_PILE'}, 7, 'id')).toEqual({source: 'DISCARD_PILE', version: 7, commandId: 'id'});
        expect(drawBody({source: 'DECK'}, 7, 'id').source).toBe('DECK');
    });

    it('discard: cards and groups become hand indexes', () => {
        const body = discardBody(HAND, {card: DISCARD, groups: [THREE]}, 3, 'id');
        expect(body).toEqual({card: 0, groups: [[8, 9, 10]], version: 3, commandId: 'id'});
    });

    it('discard: tells apart equal cards from different decks', () => {
        const hand = [c('ACE', 'SPADES', 1), c('ACE', 'SPADES', 2)];
        expect(discardBody(hand, {card: c('ACE', 'SPADES', 2)}, 1, 'id').card).toBe(1);
    });

    it('discard: rejects a card that is not in the hand or is inside a group', () => {
        expect(() => discardBody(HAND, {card: c('Q', 'SPADES')}, 1, 'id')).toThrow(InvalidIntentError);
        expect(() => discardBody(HAND, {card: THREE[0], groups: [THREE]}, 1, 'id')).toThrow('INVALID_GROUPS');
    });

    it('close 4-3-3: builds the body with type, groups and discard', () => {
        const body = closeBody(HAND, {
            closeType: 'WIN_4_3_3',
            declaration: {groups: [FOUR, THREE, RUN], discard: DISCARD, leftovers: []},
        }, 5, 'id');
        expect(body).toEqual({type: 'WIN_4_3_3', groups: [[4, 5, 6, 7], [8, 9, 10], [1, 2, 3]], discard: 0, version: 5, commandId: 'id'});
    });

    it('close: the declaration must cover exactly the hand', () => {
        const incomplete = {groups: [FOUR, THREE], discard: DISCARD, leftovers: []};
        expect(() => closeBody(HAND, {closeType: 'WIN_4_3_3', declaration: incomplete}, 1, 'id')).toThrow('INVALID_GROUPS');
        const repeated = {groups: [FOUR, THREE, RUN], discard: DISCARD, leftovers: [DISCARD]};
        expect(() => closeBody(HAND, {closeType: 'KNOCK', declaration: repeated}, 1, 'id')).toThrow('INVALID_GROUPS');
    });
});

describe('close shape from the organization', () => {
    it('1 four + 2 threes with no leftovers is 4-3-3', () => {
        expect(closeShape([THREE, FOUR, RUN], [])).toBe('WIN_4_3_3');
    });

    it('3 threes + 1 leftover is a knock', () => {
        expect(closeShape([THREE, RUN, FOUR.slice(0, 3)], [FOUR[3]])).toBe('KNOCK');
    });

    it('any other organization is not a close', () => {
        expect(closeShape([THREE, RUN], FOUR)).toBeNull();
        expect(closeShape([THREE, FOUR, RUN], [DISCARD])).toBeNull();
    });

    it('leftovers and points', () => {
        const loose = leftoversOf(HAND, [FOUR, THREE], DISCARD);
        expect(loose).toEqual(RUN);
        expect(points(loose)).toBe(9);
        expect(points([c('ACE', 'SPADES'), c('J', 'SPADES')])).toBe(20);
    });
});

describe('meld feedback (same rule as the backend evaluator)', () => {
    it('sets: same rank, at most two copies of a card', () => {
        expect(meldKind(THREE)).toBe('SET');
        expect(meldKind(FOUR)).toBe('SET');
        expect(meldKind([c('ACE', 'SPADES', 1), c('ACE', 'SPADES', 2), c('ACE', 'HEARTS')])).toBe('SET');
        expect(meldKind([c('ACE', 'SPADES', 1), c('ACE', 'SPADES', 2), c('ACE', 'SPADES', 1)])).toBeNull();
    });

    it('runs: same suit and consecutive, wrapping from K to A', () => {
        expect(meldKind(RUN)).toBe('RUN');
        expect(meldKind([c('Q', 'SPADES'), c('K', 'SPADES'), c('ACE', 'SPADES')])).toBe('RUN');
        expect(meldKind([c('K', 'SPADES'), c('ACE', 'SPADES'), c('TWO', 'SPADES')])).toBe('RUN');
        expect(meldKind([c('TEN', 'SPADES'), c('J', 'SPADES'), c('Q', 'SPADES'), c('K', 'SPADES')])).toBe('RUN');
    });

    it('rejects mixed suits, gaps and wrong sizes', () => {
        expect(meldKind([c('TWO', 'HEARTS'), c('THREE', 'SPADES'), c('FOUR', 'HEARTS')])).toBeNull();
        expect(meldKind([c('TWO', 'HEARTS'), c('FOUR', 'HEARTS'), c('FIVE', 'HEARTS')])).toBeNull();
        expect(meldKind(THREE.slice(0, 2))).toBeNull();
        expect(meldKind([...FOUR, DISCARD])).toBeNull();
    });

    it('unmatched points include the cards of groups that are not melds (same rule as the backend)', () => {
        const run = [c('SIX', 'CLUBS'), c('EIGHT', 'CLUBS'), c('SEVEN', 'CLUBS')];
        const set = [c('FIVE', 'DIAMONDS'), c('FIVE', 'HEARTS'), c('FIVE', 'CLUBS')];
        const incomplete = [c('TEN', 'DIAMONDS'), c('NINE', 'DIAMONDS')];
        const noMeld = [c('TWO', 'SPADES'), c('THREE', 'HEARTS'), c('FOUR', 'SPADES')];
        const loose = [c('FOUR', 'CLUBS'), c('TEN', 'HEARTS'), c('Q', 'DIAMONDS')];

        const unmatched = unmatchedCards([run, set, incomplete], loose);
        expect(unmatched.inInvalidGroups).toBe(2);
        expect(unmatched.cards).toHaveLength(5);
        expect(points(unmatched.cards)).toBe(43);

        expect(points(unmatchedCards([run, set, noMeld], loose).cards)).toBe(24 + 9);
        expect(unmatchedCards([run, set], loose)).toEqual({cards: loose, inInvalidGroups: 0});
        expect(unmatchedCards([[]], [])).toEqual({cards: [], inInvalidGroups: 0});
    });

    it('sorts loose cards for display by rank or suit', () => {
        const loose = [c('K', 'SPADES'), c('TWO', 'HEARTS'), c('TWO', 'SPADES')];
        expect(sortCards(loose, 'RANK').map((x) => x.rank)).toEqual(['TWO', 'TWO', 'K']);
        expect(sortCards(loose, 'SUIT').map((x) => x.suit)).toEqual(['SPADES', 'SPADES', 'HEARTS']);
    });
});

describe('local organization of the hand', () => {
    it('uses the server organization when there is no local one', () => {
        expect(reconcileGroups(null, HAND, [[8, 9, 10]])).toEqual([THREE]);
    });

    it('keeps the local one and drops the cards that left the hand', () => {
        const withoutAKing = HAND.filter((x) => x !== THREE[0]);
        expect(reconcileGroups([THREE, [DISCARD]], withoutAKing, [])).toEqual([THREE.slice(1), [DISCARD]]);
        expect(reconcileGroups([[THREE[0]]], withoutAKing, [])).toEqual([]);
    });
});

describe('versions and refetching', () => {
    it('never goes back and refetches on a jump', () => {
        expect(compareVersion(undefined, 4)).toBe('APPLY');
        expect(compareVersion(4, 4)).toBe('APPLY');
        expect(compareVersion(4, 5)).toBe('APPLY');
        expect(compareVersion(4, 3)).toBe('IGNORE');
        expect(compareVersion(4, 7)).toBe('REFRESH');
    });

    it('refetches after concurrency and turn errors', () => {
        ['STALE_VERSION', 'ROUND_ALREADY_CLOSED', 'NOT_YOUR_TURN', 'INVALID_TURN_PHASE']
            .forEach((code) => expect(shouldRefresh(code)).toBe(true));
        expect(shouldRefresh('INVALID_GROUPS')).toBe(false);
    });
});

describe('card image', () => {
    it('maps rank and suit to the file names', () => {
        expect(cardImage(c('ACE', 'CLUBS'))).toEqual({suit: 'CLUB', type: 'A'});
        expect(cardImage(c('TEN', 'HEARTS'))).toEqual({suit: 'HEART', type: 'C10'});
    });
});
