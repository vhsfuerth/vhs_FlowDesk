import React from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const Notification = ({ type, message, isVisible, onClose }) => {
  if (!isVisible) return null;

  const typeConfig = {
    success: { icon: CheckCircle2, bg: 'bg-[#afc805]', text: 'text-white' },
    error: { icon: AlertCircle, bg: 'bg-[#e1000f]', text: 'text-white' },
    info: { icon: Info, bg: 'bg-[#00285a]', text: 'text-white' },
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className={`fixed bottom-4 right-4 ${config.bg} ${config.text} px-4 py-3 rounded-md shadow-lg flex items-center space-x-3 z-50 animate-bounce-short`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full ml-auto" aria-label="Benachrichtigung schliessen">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
