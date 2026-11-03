import React, { useCallback } from 'react';
import AiPrivacyNotice from '../components/AiPrivacyNotice';
import { hasAiConsent, setAiConsent } from '../storage/settings';
import { useConfirm } from './useConfirm';

/**
 * Liefert `ensureAiConsent() => Promise<boolean>`. Zeigt vor dem ersten
 * KI-Aufruf den Datenschutzhinweis und merkt sich die Bestätigung lokal.
 */
export const useAiConsent = () => {
    const confirm = useConfirm();

    return useCallback(async () => {
        if (hasAiConsent()) return true;
        const accepted = await confirm({
            title: 'Datenschutzhinweis zur KI-Funktion',
            message: <AiPrivacyNotice />,
            confirmLabel: 'Verstanden – fortfahren',
            cancelLabel: 'Abbrechen'
        });
        if (accepted) setAiConsent();
        return accepted;
    }, [confirm]);
};
