import { Carta, Palo } from '../reglas/contrato/regla-juego.plugin';
import { Card } from './card';
import { CardTypeConstants } from './card-type.constants';

/**
 * Valor numérico de cada tipo de carta en el contrato de reglas (A = 1 ... K = 13).
 */
const VALOR_EN_CONTRATO: Record<CardTypeConstants, number> = {
	[CardTypeConstants.A]: 1,
	[CardTypeConstants.C2]: 2,
	[CardTypeConstants.C3]: 3,
	[CardTypeConstants.C4]: 4,
	[CardTypeConstants.C5]: 5,
	[CardTypeConstants.C6]: 6,
	[CardTypeConstants.C7]: 7,
	[CardTypeConstants.C8]: 8,
	[CardTypeConstants.C9]: 9,
	[CardTypeConstants.C10]: 10,
	[CardTypeConstants.J]: 11,
	[CardTypeConstants.Q]: 12,
	[CardTypeConstants.K]: 13,
};

/**
 * Traduce una carta del dominio al lenguaje del contrato de reglas (capa anticorrupción).
 * Las pintas del dominio y del contrato usan los mismos nombres (`CardSuitConstants`).
 * @param {Card} card La carta del dominio.
 * @returns {Carta} La carta en el contrato.
 */
export function aCarta(card: Card): Carta {
	return {
		valor: VALOR_EN_CONTRATO[card.type.toString() as CardTypeConstants],
		palo: card.suit.toString() as Palo,
	};
}

/**
 * Traduce un grupo de cartas del dominio al contrato. Un grupo ausente se trata como vacío.
 * @param {Card[]} cards Las cartas del grupo.
 * @returns {Carta[]} Las cartas en el contrato.
 */
export function aCartas(cards: ReadonlyArray<Card> | undefined): Carta[] {
	return (cards ?? []).map(aCarta);
}
