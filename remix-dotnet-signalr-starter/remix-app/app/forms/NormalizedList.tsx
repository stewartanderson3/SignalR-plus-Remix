import React from 'react';
import { TextInput } from './TextInput';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    items: Record<string, object> | undefined;
    setItems: (items: Record<string, object>) => void;
};

export const NormalizedList: React.FC<Props> = ({ items, setItems, ...otherProps }) => {
    const [itemName, setItemName] = React.useState<string>('');

    const addItem = () => {
        if (itemName.trim() === '') return;
        setItems({ ...items, [itemName]: {} });
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
                value={itemName}
                onChange={setItemName}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem();
                    }
                }}
            />
            <ul>
                {itemNames.map((key) => (
                    <li key={key} style={{ marginBottom: '0.5rem' }}>
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
