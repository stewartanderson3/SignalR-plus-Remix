import React from 'react';
import { TextInput } from './TextInput';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    items: Record<string, object> | undefined;
    setItems: (items: Record<string, object>) => void;
    autoFocus?: boolean;
    cardWidth?: number;
};

export const NormalizedList: React.FC<Props> = ({ items, setItems, autoFocus, cardWidth = 260, ...otherProps }) => {
    const [itemName, setItemName] = React.useState<string>('');

    const addItem = () => {
        if (itemName.trim() === '') return;
        setItems({ ...items, [itemName.trim()]: {} });
        setItemName('');
    };

    const deleteItem = (name: string) => {
        const { [name]: _, ...rest } = items || {};
        setItems(rest || {});
    };


    const itemNames = Object.keys(items || {}).sort();

    return (
        <div
            className="normalized-list"
            style={{
                flex: `0 1`,
                width: cardWidth,
                padding: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <TextInput
                    {...otherProps}
                    autoFocus={autoFocus}
                    type="text"
                    value={itemName}
                    onChange={setItemName as unknown as (value: string | number) => void}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem();
                        }
                    }}
                />
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={itemName.trim() === ''}
                    onClick={addItem}
                    aria-label="Add item"
                >
                    Add
                </button>
            </div>
            <ul style={{ padding: 0, margin: 0 }}>
                {itemNames.map((key) => (
                    <li key={key} style={{ marginBottom: '0.5rem', listStyleType: 'none' }}>
                        <button
                            type="button"
                            className='btn btn-danger'
                            onClick={() => deleteItem(key)}
                        >
                            Delete
                        </button>
                        &nbsp;{key}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const NormalizedListGrid: React.FC<React.PropsWithChildren<{ gap?: number; align?: string }>> = ({ children, gap = 16, align = 'flex-start' }) => (
    <div
        className="normalized-list-grid"
        style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: gap,
            alignItems: align as any,
        }}
    >
        {children}
    </div>
);
