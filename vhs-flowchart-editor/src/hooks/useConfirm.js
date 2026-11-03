import { createContext, useContext } from 'react';

export const ConfirmContext = createContext(null);

/**
 * Liefert `confirm(options) => Promise<boolean>` als Ersatz für `window.confirm`.
 * Optionen: { title, message, confirmLabel, cancelLabel, tone: 'default' | 'danger' }
 */
export const useConfirm = () => {
    const confirm = useContext(ConfirmContext);
    if (!confirm) {
        throw new Error('useConfirm muss innerhalb von <ConfirmProvider> verwendet werden.');
    }
    return confirm;
};
