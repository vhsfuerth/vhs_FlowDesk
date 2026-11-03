import React from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const Notification = ({ type, message, isVisible, onClose }) => {
  if (!isVisible) return null;

  const typeConfig = {
    success: { icon: CheckCircle2, bg: 'bg-[#afc805]', text: 'text-[#00285a]' },
    error: { icon: AlertCircle, bg: 'bg-[#e1000f]', text: 'text-white' },
    info: { icon: Info, bg: 'bg-[#00285a]', text: 'text-white' },
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`fixed bottom-4 right-4 ${config.bg} ${config.text} px-4 py-3 rounded-md shadow-lg flex items-center space-x-3 z-[70] animate-bounce-short`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium whitespace-pre-line">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full ml-auto" aria-label="Benachrichtigung schließen">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
