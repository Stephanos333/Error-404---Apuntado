import {JSX, useEffect, useState} from 'react';
import {Button} from '@mui/material';
import {CheckRounded, LockRounded} from '@mui/icons-material';
import {CardComponent} from '../../components/card/card.component.tsx';
import {CardFanComponent} from '../../components/card-fan/card-fan.component.tsx';
import {SegmentedComponent} from '../../components/segmented/segmented.component.tsx';
import {LocalLoadingComponent} from '../../components/loading/local/local-loading.component.tsx';
import {AlertComponent} from '../../components/alert/alert.component.tsx';
import {TokenAmountComponent} from '../../components/token/token.component.tsx';
import {CardDesignShopType} from '../../types/card-design.shop.type.ts';
import {CardDesignType} from '../../types/card-design.type.ts';
import {GetActiveCardDesigns} from '../../types/services/get-active-card-designs.ts';
import {GetCurrentCardDesign} from '../../types/services/get-current-card-design.ts';
import {UpdateUserCardDesignRequest, UpdateUserCardDesignResponse} from '../../types/services/update-user-card-design.ts';
import {BackendUtils} from '../../utils/backend.utils.tsx';
import {BackendConstants} from '../../utils/constants/backend.constants.ts';
import {AlertTypeConstants} from '../../utils/constants/alert.constants.ts';
import {CardDesignTitleConstants} from '../../utils/constants/card-design.constants.ts';
import {CardSuitsConstants} from '../../utils/constants/card-suits.constants.ts';
import {useUser} from '../../config/user.context.tsx';
import './card-design.page.css';

/** Ranks shown in the preview, as image codes. */
const RANKS: ReadonlyArray<string> = ['A', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'J', 'Q', 'K'];

/**
 * Card designs: preview every design with the whole suit and pick the one to play with.
 */
export function CardDesignPage(): JSX.Element {
    const {refreshUser} = useUser();
    const [designs, setDesigns] = useState<CardDesignShopType[] | undefined>();
    const [userDesign, setUserDesign] = useState<CardDesignType | undefined>();
    const [preview, setPreview] = useState<CardDesignShopType | CardDesignType | undefined>();
    const [suit, setSuit] = useState<CardSuitsConstants>(CardSuitsConstants.HEART);
    const [saving, setSaving] = useState<boolean>(false);
    const [alertType, setAlertType] = useState<AlertTypeConstants>(AlertTypeConstants.ERROR_ALERT);
    const [alertMessage, setAlertMessage] = useState<string>('');

    useEffect(() => {
        async function fetchData(): Promise<void> {
            const backendUtils: BackendUtils = new BackendUtils();
            const [active, current] = await Promise.all([
                backendUtils.get<GetActiveCardDesigns, never>(BackendConstants.GET_ACTIVE_CARD_DESIGNS_URL),
                backendUtils.get<GetCurrentCardDesign, never>(BackendConstants.GET_CURRENT_CARD_DESIGN_URL),
            ]);
            if (active) setDesigns(active.data);
            if (current) {
                setUserDesign(current.design);
                setPreview(current.design);
            }
        }

        fetchData().then();
    }, []);

    /** Saves the previewed design as the user's design. */
    const saveDesign = async (): Promise<void> => {
        if (!preview?.cardDesignId) {
            setAlertType(AlertTypeConstants.ERROR_ALERT);
            setAlertMessage('CARD_DESIGN_ID_IS_REQUIRED_ERROR');
            return;
        }
        setSaving(true);
        const backendUtils: BackendUtils = new BackendUtils((message: string) => {
            setAlertType(AlertTypeConstants.ERROR_ALERT);
            setAlertMessage(message);
        });
        const body: UpdateUserCardDesignRequest = {cardDesignId: preview.cardDesignId};
        const res = await backendUtils.patch<UpdateUserCardDesignResponse, UpdateUserCardDesignRequest>(BackendConstants.UPDATE_USER_CARD_DESIGN_URL, body);
        if (res) {
            setUserDesign(preview);
            setAlertType(AlertTypeConstants.SUCCESS_ALERT);
            setAlertMessage('CARD_DESIGN_SAVED_MESSAGE');
            await refreshUser();
        }
        setSaving(false);
    };

    const previewShop: CardDesignShopType | undefined = designs?.find((d) => d.cardDesignId === preview?.cardDesignId);
    const inUse: boolean = !!preview && preview.cardDesignId === userDesign?.cardDesignId;
    const locked: boolean = !!previewShop && !previewShop.canSelect;
    const title = (name: string): string => CardDesignTitleConstants[name] ?? name;

    return (
        <div className='designs-page page-width'>
            <header className='designs-header'>
                <h1>Diseños de cartas</h1>
                <p className='muted'>Elige cómo se ven tus cartas en la mesa.</p>
            </header>

            <div className='designs-grid'>
                <section className='designs-preview' aria-labelledby='designs-preview-title'>
                    {
                        preview
                            ? <>
                                <div className='designs-preview-head'>
                                    <div>
                                        <h2 id='designs-preview-title'>{title(preview.name)}</h2>
                                        <p className='muted'>
                                            {inUse ? 'Es el diseño que usas ahora.' : locked ? 'Este diseño todavía no se puede comprar.' : 'Vista previa: guárdalo para jugar con él.'}
                                        </p>
                                    </div>
                                    <SegmentedComponent
                                        label='Palo de la vista previa'
                                        hideLabel
                                        tone='felt'
                                        value={suit}
                                        onChange={setSuit}
                                        options={[
                                            {value: CardSuitsConstants.HEART, label: '♥\uFE0E', ariaLabel: 'Corazones'},
                                            {value: CardSuitsConstants.SPADE, label: '♠\uFE0E', ariaLabel: 'Picas'},
                                            {value: CardSuitsConstants.DIAMOND, label: '♦\uFE0E', ariaLabel: 'Diamantes'},
                                            {value: CardSuitsConstants.CLUB, label: '♣\uFE0E', ariaLabel: 'Tréboles'},
                                        ]}
                                    />
                                </div>
                                <div className='designs-preview-fan' key={`${preview.name}-${suit}`}>
                                    <CardFanComponent
                                        designName={preview.name}
                                        groups={[RANKS.map((type) => ({suit, type}))]}
                                        spread={3.4}
                                        dealIn
                                    />
                                </div>
                                <div className='designs-preview-actions'>
                                    {
                                        inUse
                                            ? <span className='designs-in-use'><CheckRounded/> En uso</span>
                                            : locked
                                                ? <span className='designs-locked'><LockRounded fontSize='small'/> Disponible próximamente
                                                    {previewShop?.price ? <> por <TokenAmountComponent amount={previewShop.price} size='sm'/></> : <></>}
                                                </span>
                                                : <Button variant='contained' size='large' onClick={saveDesign} disabled={saving}>Usar este diseño</Button>
                                    }
                                </div>
                            </>
                            : <LocalLoadingComponent loading={true} showBackground={false} label='Cargando tu diseño…'/>
                    }
                </section>

                <section className='designs-list' aria-labelledby='designs-list-title'>
                    <h2 id='designs-list-title'>Todos los diseños</h2>
                    {
                        designs
                            ? <ul>
                                {designs.map((design) => {
                                    const selected: boolean = design.cardDesignId === preview?.cardDesignId;
                                    const current: boolean = design.cardDesignId === userDesign?.cardDesignId;
                                    return (
                                        <li key={design.cardDesignId}>
                                            <button
                                                type='button'
                                                className={`designs-tile ${selected ? 'is-selected' : ''} ${design.canSelect ? '' : 'is-locked'}`}
                                                aria-pressed={selected}
                                                onClick={() => setPreview(design)}
                                            >
                                                <CardComponent designName={design.name} suit={CardSuitsConstants.SPADE} type='A' positionClassName='designs-tile-card'/>
                                                <span className='designs-tile-name'>{title(design.name)}</span>
                                                <span className='designs-tile-state'>
                                                    {current
                                                        ? 'En uso'
                                                        : design.canSelect
                                                            ? (design.isFree ? 'Gratis' : 'Tuyo')
                                                            : design.price ? <TokenAmountComponent amount={design.price} size='sm'/> : 'Bloqueado'}
                                                </span>
                                                {!design.canSelect ? <LockRounded className='designs-tile-lock' fontSize='small'/> : <></>}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            : <LocalLoadingComponent loading={true} showBackground={false} label='Cargando diseños…'/>
                    }
                </section>
            </div>

            <AlertComponent type={alertType} rawMessage={alertMessage} setRawMessage={setAlertMessage}/>
        </div>
    );
}
