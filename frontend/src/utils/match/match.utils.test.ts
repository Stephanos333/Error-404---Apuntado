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
} from './match.utils.ts';

const c = (valor: CardRank, palo: CardSuit, baraja = 1): MatchCard => ({valor, palo, baraja});

/** 11-card hand: four sevens, three kings, a run of hearts and 1 loose card. */
const FOUR = [c('SIETE', 'PICAS'), c('SIETE', 'CORAZONES'), c('SIETE', 'TREBOLES'), c('SIETE', 'DIAMANTES')];
const THREE = [c('K', 'PICAS'), c('K', 'CORAZONES'), c('K', 'TREBOLES')];
const RUN = [c('DOS', 'CORAZONES'), c('TRES', 'CORAZONES'), c('CUATRO', 'CORAZONES')];
const DISCARD = c('NUEVE', 'DIAMANTES');
const HAND = [DISCARD, ...RUN, ...FOUR, ...THREE];

describe('generateCommandId', () => {
    it('generates distinct UUID v4 values', () => {
        const a = generateCommandId();
        expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(generateCommandId()).not.toBe(a);
    });
});

describe('translating intents into the backend contract', () => {
    it('draw: DISCARD_PILE is sent as DESCARTE', () => {
        expect(drawBody({source: 'DISCARD_PILE'}, 7, 'id')).toEqual({origen: 'DESCARTE', version: 7, idComando: 'id'});
        expect(drawBody({source: 'DECK'}, 7, 'id').origen).toBe('MAZO');
    });

    it('discard: cards and groups become hand indexes', () => {
        const body = discardBody(HAND, {card: DISCARD, groups: [THREE]}, 3, 'id');
        expect(body).toEqual({carta: 0, grupos: [[8, 9, 10]], version: 3, idComando: 'id'});
    });

    it('discard: tells apart equal cards from different decks', () => {
        const hand = [c('AS', 'PICAS', 1), c('AS', 'PICAS', 2)];
        expect(discardBody(hand, {card: c('AS', 'PICAS', 2)}, 1, 'id').carta).toBe(1);
    });

    it('discard: rejects a card that is not in the hand or is inside a group', () => {
        expect(() => discardBody(HAND, {card: c('Q', 'PICAS')}, 1, 'id')).toThrow(InvalidIntentError);
        expect(() => discardBody(HAND, {card: THREE[0], groups: [THREE]}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
    });

    it('close 4-3-3: builds the body with type, groups and discard', () => {
        const body = closeBody(HAND, {
            closeType: 'GANAR_4_3_3',
            declaration: {groups: [FOUR, THREE, RUN], discard: DISCARD, leftovers: []},
        }, 5, 'id');
        expect(body).toEqual({tipo: 'GANAR_4_3_3', grupos: [[4, 5, 6, 7], [8, 9, 10], [1, 2, 3]], descarte: 0, version: 5, idComando: 'id'});
    });

    it('close: the declaration must cover exactly the hand', () => {
        const incomplete = {groups: [FOUR, THREE], discard: DISCARD, leftovers: []};
        expect(() => closeBody(HAND, {closeType: 'GANAR_4_3_3', declaration: incomplete}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
        const repeated = {groups: [FOUR, THREE, RUN], discard: DISCARD, leftovers: [DISCARD]};
        expect(() => closeBody(HAND, {closeType: 'TOCAR', declaration: repeated}, 1, 'id')).toThrow('GRUPOS_INVALIDOS');
    });
});

describe('close shape from the organization', () => {
    it('1 four + 2 threes with no leftovers is 4-3-3', () => {
        expect(closeShape([THREE, FOUR, RUN], [])).toBe('GANAR_4_3_3');
    });

    it('3 threes + 1 leftover is a knock', () => {
        expect(closeShape([THREE, RUN, FOUR.slice(0, 3)], [FOUR[3]])).toBe('TOCAR');
    });

    it('any other organization is not a close', () => {
        expect(closeShape([THREE, RUN], FOUR)).toBeNull();
        expect(closeShape([THREE, FOUR, RUN], [DISCARD])).toBeNull();
    });

    it('leftovers and points', () => {
        const loose = leftoversOf(HAND, [FOUR, THREE], DISCARD);
        expect(loose).toEqual(RUN);
        expect(points(loose)).toBe(9);
        expect(points([c('AS', 'PICAS'), c('J', 'PICAS')])).toBe(20);
    });
});

describe('meld feedback (same rule as the backend evaluator)', () => {
    it('sets: same rank, at most two copies of a card', () => {
        expect(meldKind(THREE)).toBe('SET');
        expect(meldKind(FOUR)).toBe('SET');
        expect(meldKind([c('AS', 'PICAS', 1), c('AS', 'PICAS', 2), c('AS', 'CORAZONES')])).toBe('SET');
        expect(meldKind([c('AS', 'PICAS', 1), c('AS', 'PICAS', 2), c('AS', 'PICAS', 1)])).toBeNull();
    });

    it('runs: same suit and consecutive, wrapping from K to A', () => {
        expect(meldKind(RUN)).toBe('RUN');
        expect(meldKind([c('Q', 'PICAS'), c('K', 'PICAS'), c('AS', 'PICAS')])).toBe('RUN');
        expect(meldKind([c('K', 'PICAS'), c('AS', 'PICAS'), c('DOS', 'PICAS')])).toBe('RUN');
        expect(meldKind([c('DIEZ', 'PICAS'), c('J', 'PICAS'), c('Q', 'PICAS'), c('K', 'PICAS')])).toBe('RUN');
    });

    it('rejects mixed suits, gaps and wrong sizes', () => {
        expect(meldKind([c('DOS', 'CORAZONES'), c('TRES', 'PICAS'), c('CUATRO', 'CORAZONES')])).toBeNull();
        expect(meldKind([c('DOS', 'CORAZONES'), c('CUATRO', 'CORAZONES'), c('CINCO', 'CORAZONES')])).toBeNull();
        expect(meldKind(THREE.slice(0, 2))).toBeNull();
        expect(meldKind([...FOUR, DISCARD])).toBeNull();
    });

    it('sorts loose cards for display by rank or suit', () => {
        const loose = [c('K', 'PICAS'), c('DOS', 'CORAZONES'), c('DOS', 'PICAS')];
        expect(sortCards(loose, 'RANK').map((x) => x.valor)).toEqual(['DOS', 'DOS', 'K']);
        expect(sortCards(loose, 'SUIT').map((x) => x.palo)).toEqual(['PICAS', 'PICAS', 'CORAZONES']);
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
        ['VERSION_DESACTUALIZADA', 'RONDA_YA_CERRADA', 'TURNO_NO_CORRESPONDE', 'FASE_DE_TURNO_INVALIDA']
            .forEach((code) => expect(shouldRefresh(code)).toBe(true));
        expect(shouldRefresh('GRUPOS_INVALIDOS')).toBe(false);
    });
});

describe('card image', () => {
    it('maps rank and suit to the file names', () => {
        expect(cardImage(c('AS', 'TREBOLES'))).toEqual({suit: 'CLUB', type: 'A'});
        expect(cardImage(c('DIEZ', 'CORAZONES'))).toEqual({suit: 'HEART', type: 'C10'});
    });
});
