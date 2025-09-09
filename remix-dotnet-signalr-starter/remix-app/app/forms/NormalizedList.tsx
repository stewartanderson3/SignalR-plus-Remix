import React from 'react';
import { TextInput } from './TextInput';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    items: Record<string, object> | undefined;
    setItems: (items: Record<string, object>) => void;
    autoFocus?: boolean;
};

export const NormalizedList: React.FC<Props> = ({ items, setItems, autoFocus, ...otherProps }) => {
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
        <>
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
            <ul>
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
        </>
    );
}
