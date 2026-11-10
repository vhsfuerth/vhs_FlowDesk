import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Kurze Statusmeldung unten auf dem Bildschirm. Die Anzeigedauer richtet sich nach der Textlänge.
 * @returns {{ notification: { isVisible: boolean, message: string, type: string },
 *   showNotification: (message: string, type?: string) => void, hideNotification: () => void }}
 */
export function useNotification() {
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'info' });
  const timerRef = useRef(null);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const text = typeof message === 'string' ? message : String(message ?? '');
    setNotification({ isVisible: true, message: text, type });
    const duration = Math.max(4000, Math.min(10000, text.length * 60));
    timerRef.current = setTimeout(hideNotification, duration);
  }, [hideNotification]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { notification, showNotification, hideNotification };
}
