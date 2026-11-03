import React, { useCallback, useId, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { ConfirmContext } from '../hooks/useConfirm';
import { useDialogA11y } from '../hooks/useDialogA11y';

const ConfirmDialog = ({ title, message, confirmLabel = 'OK', cancelLabel = 'Abbrechen', tone = 'default', onConfirm, onCancel }) => {
  const dialogRef = useDialogA11y(true, onCancel);
  const titleId = useId();
  const messageId = useId();
  const isDanger = tone === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <Icon className={`w-5 h-5 ${isDanger ? 'text-[var(--color-vhs-rot)]' : 'text-[var(--color-vhs-blau)]'}`} aria-hidden="true" />
          <h2 id={titleId} className="text-base font-bold text-[var(--color-vhs-blau)]">{title}</h2>
        </div>
        <div id={messageId} className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {message}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            data-autofocus={isDanger ? true : undefined}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-white hover:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            data-autofocus={isDanger ? undefined : true}
            className={`px-4 py-1.5 text-sm font-bold text-white rounded-md transition-colors ${
              isDanger
                ? 'bg-[var(--color-vhs-rot)] hover:bg-[var(--color-vhs-rot-b)]'
                : 'bg-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-80)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const pendingResolveRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    // Eine noch offene Rückfrage gilt als abgebrochen
    pendingResolveRef.current?.(false);
    pendingResolveRef.current = resolve;
    setRequest(options);
  }), []);

  const close = (result) => {
    pendingResolveRef.current?.(result);
    pendingResolveRef.current = null;
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmDialog
          {...request}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
