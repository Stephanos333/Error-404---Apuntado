import './game-board.component.css';
import {CSSProperties, JSX, useEffect, useMemo, useRef, useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, IconButton, ThemeProvider, Tooltip} from '@mui/material';
import {CloseRounded} from '@mui/icons-material';
import {CardBackComponent, CardComponent} from '../../../../components/card/card.component.tsx';
import {LocalLoadingComponent} from '../../../../components/loading/local/local-loading.component.tsx';
import {SegmentedComponent} from '../../../../components/segmented/segmented.component.tsx';
import {AlertTypeConstants} from '../../../../utils/constants/alert.constants.ts';
import {PaperTheme} from '../../../../config/app.theme.tsx';
import {MatchCard, PrivateHandView, PublicMatchView} from '../../../../types/match.type.ts';
import {DrawIntent} from '../../../../types/services/match.ts';
import {CommandResult, MatchClient} from '../../../../utils/match/match.client.ts';
import {cardImage, cardKey, closeShape, HandSort, leftoversOf, meldKind, points, reconcileGroups, sortCards} from '../../../../utils/match/match.utils.ts';

/** Maximum groups the backend accepts in the hand organization. */
const MAX_GROUPS = 4;
/** Maximum size of a group (a four of a kind / cuarta). */
const MAX_GROUP_CARDS = 4;
/** Points under which the leftover card allows knocking (tocar). */
const KNOCK_THRESHOLD = 5;
/** How long a freshly drawn card stays highlighted. */
const NEW_CARD_MS = 2200;

type SortMode = 'ARRIVAL' | HandSort;

/**
 * Label of a group: meld name when it is one, or what is missing.
 * @param {MatchCard[]} group The group.
 */
function groupLabel(group: MatchCard[]): { text: string; valid: boolean } {
    const kind = meldKind(group);
    if (kind === 'RUN') return {text: group.length === 4 ? 'Escalera de 4' : 'Escalera', valid: true};
    if (kind === 'SET') return {text: group.length === 4 ? 'Cuarta' : 'Terna', valid: true};
    if (group.length < 3) return {text: `${group.length} de 3 cartas`, valid: false};
    return {text: 'No combina', valid: false};
}

/**
 * Game board: draw pile, discard pile, the hand organized in groups and the turn actions
 * (draw, discard and close according to the mode).
 *
 * The hand organization is local until it is sent with `discard` or `close`. The rules are
 * decided by the server: here the shape and melds are only checked to give clear feedback.
 * @param props.match The public match view.
 * @param props.hand The user's hand (`null` when eliminated).
 * @param props.myId The authenticated user's id.
 * @param props.design The user's card design.
 * @param props.client The match command client.
 * @param props.applyResult Applies a command response to the state.
 * @param props.showAlert Shows a message to the user.
 */
export function GameBoardComponent(props: {
    match: PublicMatchView | undefined,
    hand: PrivateHandView | null | undefined,
    myId: string | null,
    design: string,
    client: MatchClient,
    applyResult: (result: CommandResult) => void,
    showAlert: (type: AlertTypeConstants, code: string) => void,
}): JSX.Element {
    const {match, hand, showAlert} = props;

    /** Local organization of the hand and the selected cards (by key). */
    const [groups, setGroups] = useState<MatchCard[][] | null>(null);
    const [selection, setSelection] = useState<string[]>([]);
    const [sending, setSending] = useState<boolean>(false);
    const [sortMode, setSortMode] = useState<SortMode>('ARRIVAL');
    const [newCards, setNewCards] = useState<Set<string>>(new Set());
    const [confirmClose, setConfirmClose] = useState<boolean>(false);
    const groupsRound = useRef<number | undefined>();
    const previousHand = useRef<Set<string> | null>(null);
    const roundNumber: number | undefined = match?.round?.number;

    /**
     * When a new hand arrives the local organization is kept (minus the cards that left).
     * On a new round the server's organization is used.
     */
    useEffect(() => {
        if (!hand) {
            setGroups(null);
            setSelection([]);
            previousHand.current = null;
            return;
        }
        const sameRound = groupsRound.current === roundNumber;
        groupsRound.current = roundNumber;
        setGroups((previous) => reconcileGroups(sameRound ? previous : null, hand.cards, hand.groups));
        const inHand = new Set(hand.cards.map(cardKey));
        setSelection((previous) => previous.filter((k) => inHand.has(k)));

        // Highlights the card that just arrived (a draw), not a whole new deal.
        const before = previousHand.current;
        previousHand.current = inHand;
        const arrived = before && sameRound ? [...inHand].filter((k) => !before.has(k)) : [];
        if (arrived.length > 0 && arrived.length <= 2) setNewCards(new Set(arrived));
    }, [hand, roundNumber]);

    useEffect(() => {
        if (newCards.size === 0) return undefined;
        const timer = setTimeout(() => setNewCards(new Set()), NEW_CARD_MS);
        return () => clearTimeout(timer);
    }, [newCards]);

    const round = match?.round ?? null;
    const cards: MatchCard[] = hand?.cards ?? [];
    const currentGroups: MatchCard[][] = groups ?? [];
    const loose: MatchCard[] = leftoversOf(cards, currentGroups);
    const shownLoose: MatchCard[] = sortMode === 'ARRIVAL' ? loose : sortCards(loose, sortMode);
    const selected: MatchCard[] = loose.filter((c) => selection.includes(cardKey(c)));
    const playable: boolean = match?.status === 'IN_PROGRESS' && (round?.status === 'IN_TURNS' || round?.status === 'EXTRA_ROUND');
    const myTurn: boolean = !!hand && playable && round?.turn.playerId === props.myId;
    const canDraw: boolean = myTurn && round?.turn.phase === 'AWAITING_DRAW';
    const withEleven: boolean = myTurn && round?.turn.phase === 'HOLDING_11_CARDS';
    const isApuntado: boolean = match?.mode === 'apuntado';
    const nameOf = (playerId: string): string =>
        match?.players.find((j) => j.playerId === playerId)?.username ?? 'otro jugador';

    /** Live preview of a close with the selected card as the discard. */
    const closePreview = useMemo(() => {
        const discard: MatchCard | null = selected.length === 1 ? selected[0] : null;
        if (!discard) return {shape: null, ready: false, discard: null, leftovers: [] as MatchCard[]};
        const leftovers = leftoversOf(cards, currentGroups, discard);
        const shape = closeShape(currentGroups, leftovers);
        const allowed = !!shape && (isApuntado || shape === 'WIN_4_3_3');
        const melds = currentGroups.every((g) => meldKind(g) !== null);
        const knockOk = shape !== 'KNOCK' || points(leftovers) < KNOCK_THRESHOLD;
        return {shape: allowed ? shape : null, ready: allowed && melds && knockOk, discard, leftovers};
    }, [selected, cards, currentGroups, isApuntado]);

    /** Sends a command, applies the resulting state and shows the controlled error, if any. */
    const execute = async (command: () => Promise<CommandResult>): Promise<boolean> => {
        setSending(true);
        const result = await command();
        props.applyResult(result);
        if (!result.ok) showAlert(AlertTypeConstants.ERROR_ALERT, result.code);
        setSending(false);
        return result.ok;
    };

    const draw = async (source: DrawIntent['source']): Promise<void> => {
        if (!canDraw || sending) return;
        if (source === 'DISCARD_PILE' && !round?.topDiscard) {
            showAlert(AlertTypeConstants.WARNING_ALERT, 'EMPTY_DISCARD_PILE');
            return;
        }
        await execute(() => props.client.draw({source}));
    };

    const toggleSelection = (card: MatchCard): void => {
        const key = cardKey(card);
        setSelection((previous) => previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key]);
    };

    const formGroup = (): void => {
        if (selected.length < 1 || selected.length > MAX_GROUP_CARDS) {
            showAlert(AlertTypeConstants.WARNING_ALERT, 'SELECT_GROUP_CARDS_MESSAGE');
            return;
        }
        if (currentGroups.length >= MAX_GROUPS) {
            showAlert(AlertTypeConstants.WARNING_ALERT, 'MAX_GROUPS_MESSAGE');
            return;
        }
        setGroups([...currentGroups, selected]);
        setSelection([]);
    };

    const dissolveGroup = (index: number): void => {
        setGroups(currentGroups.filter((_, i) => i !== index));
    };

    /** Moves one card from a group back to the loose cards. */
    const takeFromGroup = (index: number, card: MatchCard): void => {
        setGroups(currentGroups.map((g, i) => i === index ? g.filter((c) => cardKey(c) !== cardKey(card)) : g).filter((g) => g.length > 0));
    };

    const discard = async (): Promise<void> => {
        if (!withEleven || sending) return;
        if (selected.length !== 1) {
            showAlert(AlertTypeConstants.WARNING_ALERT, 'SELECT_ONE_CARD_MESSAGE');
            return;
        }
        const ok = await execute(() => props.client.discard({card: selected[0], groups: currentGroups}));
        if (ok) setSelection([]);
    };

    /**
     * Close: the selected card is the discard; the other loose cards are the leftovers.
     * The shape (4-3-3 or knock) comes from the groups; validity is decided by the server.
     * @param {boolean} confirmed Whether the player confirmed a close that looks invalid.
     */
    const close = async (confirmed: boolean = false): Promise<void> => {
        if (!withEleven || sending) return;
        const shapeMessage = isApuntado ? 'SHAPE_APUNTADO_MESSAGE' : 'SHAPE_4_3_3_MESSAGE';
        const {shape, discard: discardCard, leftovers, ready} = closePreview;
        if (!discardCard || !shape) {
            showAlert(AlertTypeConstants.WARNING_ALERT, shapeMessage);
            return;
        }
        if (!ready && !confirmed) {
            setConfirmClose(true);
            return;
        }
        setConfirmClose(false);
        const ok = await execute(() => props.client.close({
            closeType: shape,
            declaration: {groups: currentGroups, discard: discardCard, leftovers},
        }));
        if (ok) setSelection([]);
    };

    /** Turn status text. */
    const status = (): { title: string; detail?: string } => {
        if (!match || !round) return {title: 'Esperando el estado de la partida…'};
        if (!hand) return {title: 'Quedaste eliminado', detail: 'Puedes seguir mirando la partida.'};
        if (!playable) return {title: 'Contando los puntos de la ronda…'};
        if (!myTurn) return {title: `Turno de ${nameOf(round.turn.playerId)}`, detail: 'Mientras tanto, organiza tus grupos.'};
        if (canDraw) return {title: 'Tu turno', detail: 'Roba una carta del mazo o la de arriba del descarte.'};
        return {title: 'Tu turno', detail: 'Organiza tus grupos y descarta una carta, o cierra si tu mano está lista.'};
    };

    const extraRound = round?.extraRound;
    const top: MatchCard | null = round?.topDiscard ?? null;
    const {title, detail} = status();
    const closeLabel: string = closePreview.shape === 'KNOCK' ? 'Tocar' : closePreview.shape === 'WIN_4_3_3' || !isApuntado ? 'Cerrar 4-3-3' : 'Cerrar o tocar';
    const looseCount: number = loose.length;

    /** Draws a card of the hand. */
    const renderCard = (c: MatchCard, onClick: (() => void) | undefined, extraClass: string = '', title?: string): JSX.Element => {
        const {suit, type} = cardImage(c);
        const key = cardKey(c);
        return (
            <CardComponent
                key={key}
                designName={props.design}
                suit={suit}
                type={type}
                selected={selection.includes(key)}
                onClick={onClick}
                title={title}
                positionClassName={`${extraClass} ${newCards.has(key) ? 'is-new' : ''}`}
            />
        );
    };

    return (
        <>
            <section className='board-center' aria-label='Mesa'>
                <div className='board-piles'>
                    <button
                        type='button'
                        className={`board-pile board-deck ${canDraw ? 'is-available' : ''}`}
                        onClick={() => draw('DECK')}
                        disabled={!canDraw || sending}
                        aria-label={`Robar del mazo, quedan ${round?.cardsInDeck ?? 0} cartas`}
                    >
                        <span className='board-deck-stack' aria-hidden='true'>
                            <CardBackComponent/>
                            <CardBackComponent/>
                            <CardBackComponent/>
                        </span>
                        <span className='board-pile-label'>Mazo <span className='num'>{round?.cardsInDeck ?? 0}</span></span>
                    </button>

                    <div className='board-status' role='status' aria-live='polite'>
                        <span className={`board-status-title ${myTurn ? 'is-mine' : ''}`}>{title}</span>
                        {detail ? <span className='board-status-detail'>{detail}</span> : <></>}
                        {
                            myTurn
                                ? <ol className='board-steps' aria-label='Pasos del turno'>
                                    <li className={canDraw ? 'is-current' : 'is-done'}>Roba</li>
                                    <li className={withEleven ? 'is-current' : ''}>Descarta o cierra</li>
                                </ol>
                                : <></>
                        }
                        {
                            extraRound
                                ? <span className='board-extra'>
                                    Ronda extra: {nameOf(extraRound.knockerId)} tocó.
                                    {extraRound.pending.length > 0 ? ` Falta${extraRound.pending.length === 1 ? '' : 'n'}: ${extraRound.pending.map(nameOf).join(', ')}.` : ''}
                                </span>
                                : <></>
                        }
                    </div>

                    <button
                        type='button'
                        className={`board-pile board-discard ${canDraw && top ? 'is-available' : ''}`}
                        onClick={() => draw('DISCARD_PILE')}
                        disabled={!canDraw || sending || !top}
                        aria-label={top ? 'Robar la carta de arriba del descarte' : 'El descarte está vacío'}
                    >
                        {
                            top
                                ? <CardComponent designName={props.design} suit={cardImage(top).suit} type={cardImage(top).type} positionClassName='board-discard-top'/>
                                : <span className='board-discard-empty' aria-hidden='true'>Vacío</span>
                        }
                        <span className='board-pile-label'>Descarte <span className='num'>{round?.cardsInDiscardPile ?? 0}</span></span>
                    </button>
                </div>
            </section>

            <section className={`board-hand ${myTurn ? 'is-my-turn' : ''}`} aria-label='Tu mano'>
                {
                    hand === undefined
                        ? <LocalLoadingComponent loading={true} showBackground={false} label='Repartiendo…'/>
                        : hand === null
                            ? <p className='board-hand-empty'>Ya no tienes cartas en esta partida.</p>
                            : <>
                                <div className='board-groups'>
                                    {currentGroups.map((g, i) => {
                                        const label = groupLabel(g);
                                        return (
                                            <div className={`board-group ${label.valid ? 'is-valid' : 'is-invalid'}`} key={g.map(cardKey).join('|')}>
                                                <div className='board-group-head'>
                                                    <span className='board-group-label'>{label.valid ? '✓ ' : ''}{label.text}</span>
                                                    <Tooltip title='Deshacer grupo' arrow>
                                                        <IconButton size='small' aria-label={`Deshacer grupo ${i + 1}`} onClick={() => dissolveGroup(i)}><CloseRounded fontSize='small'/></IconButton>
                                                    </Tooltip>
                                                </div>
                                                <div className='board-group-cards'>
                                                    {g.map((c) => renderCard(c, () => takeFromGroup(i, c), 'board-group-card', 'Devolver a la mano'))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {
                                        currentGroups.length < MAX_GROUPS
                                            ? <button
                                                type='button'
                                                className={`board-group board-group-new ${selected.length > 0 && selected.length <= MAX_GROUP_CARDS ? 'is-ready' : ''}`}
                                                onClick={formGroup}
                                                disabled={selected.length === 0}
                                            >
                                                {selected.length === 0
                                                    ? <span>Selecciona cartas y agrúpalas aquí</span>
                                                    : selected.length > MAX_GROUP_CARDS
                                                        ? <span>Máximo 4 cartas por grupo</span>
                                                        : <span><strong>+ Agrupar {selected.length}</strong> {selected.length === 1 ? 'carta' : 'cartas'}</span>}
                                            </button>
                                            : <></>
                                    }
                                </div>

                                <div className='board-loose-head'>
                                    <span className='board-loose-info'>
                                        Sueltas: <span className='num'>{looseCount}</span> {looseCount === 1 ? 'carta' : 'cartas'}, <span className='num'>{points(loose)}</span> pts
                                    </span>
                                    <SegmentedComponent
                                        label='Ordenar sueltas'
                                        hideLabel
                                        tone='felt'
                                        value={sortMode}
                                        onChange={setSortMode}
                                        options={[
                                            {value: 'ARRIVAL', label: 'Llegada'},
                                            {value: 'RANK', label: 'Número'},
                                            {value: 'SUIT', label: 'Palo'},
                                        ]}
                                    />
                                </div>
                                <div className='board-loose' style={{'--count': Math.max(shownLoose.length, 1), '--gaps': Math.max(shownLoose.length - 1, 1)} as CSSProperties}>
                                    {shownLoose.map((c) => renderCard(c, () => toggleSelection(c), 'board-loose-card'))}
                                </div>
                            </>
                }
            </section>

            <div className='board-actions'>
                <span className='board-actions-hint'>
                    {
                        !withEleven
                            ? (canDraw ? 'Primero roba una carta.' : '')
                            : round?.turn.closeAttempted
                                ? 'Ya intentaste cerrar en este turno: ahora descarta una carta.'
                                : closePreview.ready
                                    ? <strong className='board-ready'>¡Tu mano está lista para {closePreview.shape === 'KNOCK' ? 'tocar' : 'cerrar'}!</strong>
                                    : selected.length === 1
                                        ? 'Esa carta será la que descartas.'
                                        : 'Selecciona la carta que vas a descartar.'
                    }
                </span>
                <div className='board-actions-buttons'>
                    <Button
                        variant='outlined'
                        color='inherit'
                        size='large'
                        onClick={discard}
                        disabled={!withEleven || sending || selected.length !== 1}
                    >Descartar</Button>
                    <Button
                        variant='contained'
                        size='large'
                        className={closePreview.ready ? 'board-close-ready' : ''}
                        onClick={() => close()}
                        disabled={!withEleven || sending || !!round?.turn.closeAttempted}
                    >{closeLabel}</Button>
                </div>
            </div>

            <ThemeProvider theme={PaperTheme}>
                <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth='xs' fullWidth>
                    <DialogContent>
                        <h2 className='board-dialog-title'>¿Cerrar de todos modos?</h2>
                        <p>
                            {closePreview.shape === 'KNOCK' && points(closePreview.leftovers) >= KNOCK_THRESHOLD
                                ? 'La carta que te sobra vale 5 puntos o más, así que no puedes tocar.'
                                : 'Alguno de tus grupos no parece una terna, cuarta o escalera válida.'}
                            {isApuntado ? ' Si el cierre no es válido sumas 3 puntos y el turno sigue.' : ' Si el cierre no es válido, el turno sigue.'}
                        </p>
                    </DialogContent>
                    <DialogActions sx={{padding: '0 24px 20px'}}>
                        <Button onClick={() => setConfirmClose(false)}>Revisar mis grupos</Button>
                        <Button variant='contained' onClick={() => close(true)}>Cerrar igual</Button>
                    </DialogActions>
                </Dialog>
            </ThemeProvider>
        </>
    );
}
