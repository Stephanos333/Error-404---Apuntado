import {JSX, ReactNode, useId} from 'react';
import './segmented.component.css';

/**
 * Segmented control: a group of native radio buttons styled as pills, so it keeps the
 * keyboard behaviour of a radio group (arrow keys, focus ring).
 * @template T Option value type.
 * @param props.label Group label (visible unless `hideLabel`).
 * @param props.value Selected value.
 * @param props.onChange Called with the new value.
 * @param props.options The options.
 * @param props.tone `paper` for light surfaces, `felt` for the dark table.
 */
export function SegmentedComponent<T extends string | number | boolean>(props: {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: ReadonlyArray<{ value: T; label: ReactNode; ariaLabel?: string }>;
    tone?: 'paper' | 'felt';
    hideLabel?: boolean;
    stretch?: boolean;
}): JSX.Element {
    const name = useId();
    return (
        <fieldset className={`segmented segmented-${props.tone ?? 'paper'} ${props.stretch ? 'segmented-stretch' : ''}`}>
            <legend className={props.hideLabel ? 'visually-hidden' : 'segmented-legend'}>{props.label}</legend>
            <div className='segmented-track'>
                {props.options.map((option) => {
                    const id = `${name}-${String(option.value)}`;
                    return (
                        <label key={String(option.value)} htmlFor={id} className='segmented-option'>
                            <input
                                id={id}
                                type='radio'
                                name={name}
                                checked={props.value === option.value}
                                onChange={() => props.onChange(option.value)}
                                aria-label={option.ariaLabel}
                            />
                            <span>{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
