import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';

const getMenuItems = (container) => Array.from(container?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);

/**
 * Button mit aufklappendem Menü (öffnet nach oben, da in der unteren Leiste).
 * Tastatur: Pfeiltasten wechseln den Eintrag, Escape schließt.
 *
 * items: [{ label, onSelect, disabled?, hint?, separatorBefore?, heading? }]
 * Einträge mit `heading` sind nicht anklickbare Zwischenüberschriften.
 */
const MenuButton = ({ label, icon: Icon, items, title, className = '', align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    const timer = setTimeout(() => getMenuItems(containerRef.current)[0]?.focus(), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleMenuKeyDown = (event) => {
    // Tasten im Menü nicht an die globalen Kürzel der Arbeitsfläche weitergeben
    event.stopPropagation();
    const entries = getMenuItems(containerRef.current);
    const index = entries.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        title={title}
        className={className}
      >
        {Icon && <Icon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
        {label}
        <ChevronUp className={`w-3 h-3 ml-1 transition-transform ${isOpen ? '' : 'rotate-180'}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`absolute bottom-full mb-2 ${align === 'right' ? 'right-0' : 'left-0'} min-w-[260px] bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-sm text-gray-700`}
        >
          {items.map((item, index) => (
            <React.Fragment key={`${item.label || item.heading}-${index}`}>
              {item.separatorBefore && <div className="my-1 border-t border-gray-100" role="separator" />}
              {item.heading ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">{item.heading}</div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    item.onSelect();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-vhs-blau-10)] focus:bg-[var(--color-vhs-blau-10)] focus:outline-none disabled:text-gray-400 disabled:hover:bg-transparent flex items-center justify-between gap-4"
                >
                  <span>{item.label}</span>
                  {item.hint && <span className="text-xs text-gray-500">{item.hint}</span>}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuButton;
