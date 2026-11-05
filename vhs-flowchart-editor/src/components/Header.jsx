import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, FilePlus, FolderOpen, Edit2, Check, LayoutTemplate, BookOpen, Trash2 } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';
import { useConfirm } from '../hooks/useConfirm';

const Header = ({ onSettingsClick, currentDiagram, onNewDiagram, onDiagramSelect, onRename, onTemplateOpen, onGuideOpen }) => {
  const [diagrams, setDiagrams] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const menuRef = useRef(null);
  const confirm = useConfirm();

  const loadDiagrams = useCallback(async () => {
      const all = await indexeddb.getAllDiagrams().catch(() => []);
      setDiagrams(all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  }, []);

  const toggleMenu = () => {
      const nextOpen = !isMenuOpen;
      setIsMenuOpen(nextOpen);
      if (nextOpen) loadDiagrams();
  };

  // Menü bei Klick außerhalb oder Escape schließen
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSelect = (dgrm) => {
      setIsMenuOpen(false);
      onDiagramSelect(dgrm);
  };

  const handleNew = () => {
      setIsMenuOpen(false);
      onNewDiagram();
  };

  const handleDelete = async (diagram) => {
      const confirmed = await confirm({
          title: 'Diagramm löschen',
          message: `„${diagram.name}“ wirklich löschen?\n\nAlle Versionen und automatisch gesicherten Entwürfe dieses Diagramms werden ebenfalls gelöscht.`,
          confirmLabel: 'Löschen',
          tone: 'danger'
      });
      if (confirmed) {
          await indexeddb.deleteDiagram(diagram.id);
          loadDiagrams();
      }
  };

  const startEditingName = () => {
    setTempName(currentDiagram?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      if (tempName.trim() !== currentDiagram?.name) onRename(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') setIsEditingName(false);
  };

  return (
    <header className="bg-[var(--color-vhs-blau)] text-white shadow-md w-full h-16 flex items-center justify-between px-6 z-40 relative border-b border-white/10">
      <div className="flex items-center space-x-4">
        <div className="bg-white rounded p-1 overflow-hidden h-10 flex items-center shadow-md">
             <img src="/Logo_HQ_pos.png" alt="vhs Logo" className="h-full w-auto object-contain px-1" />
        </div>
        <div className="flex flex-col justify-center border-l border-white/20 pl-4">
            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--color-vhs-blau-20)] leading-none mb-1">FlowDesk</h1>
            <div className="flex items-center group">
              {isEditingName ? (
                <div className="flex items-center">
                  <input
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    aria-label="Diagrammname"
                    className="bg-white/10 text-white font-bold border-b border-[var(--color-vhs-gelb)] focus:outline-none px-1 h-6 max-w-[250px]"
                  />
                  <Check className="w-4 h-4 ml-1 text-[var(--color-vhs-gelb)] cursor-pointer" onClick={handleSaveName} aria-hidden="true" />
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center cursor-pointer text-left"
                  onClick={startEditingName}
                  title="Diagramm umbenennen"
                >
                  <span className="text-lg font-bold leading-none truncate max-w-[300px]">
                    {currentDiagram?.name || 'Unbenanntes Diagramm'}
                  </span>
                  <Edit2 className="w-3 h-3 ml-2 text-white/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                  <span className="sr-only">(umbenennen)</span>
                </button>
              )}
            </div>
        </div>
      </div>

      <nav className="flex items-center space-x-2" aria-label="Hauptmenü">
        <button
          onClick={onTemplateOpen}
          className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
        >
          <LayoutTemplate className="w-4 h-4 mr-2" aria-hidden="true" />
          Vorlagen
        </button>
        <button
          onClick={onGuideOpen}
          className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
        >
          <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
          Anleitung
        </button>

        <div className="relative" ref={menuRef}>
            <button
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="header-diagram-menu"
            className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
            >
            <FolderOpen className="w-4 h-4 mr-2" aria-hidden="true" />
            Diagramme
            </button>

            {isMenuOpen && (
                <div id="header-diagram-menu" className="absolute right-0 top-full mt-2 w-72 bg-white rounded-md shadow-xl overflow-hidden border border-gray-100 z-50 text-gray-800">
                    <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">Gespeicherte Diagramme</span>
                        <button onClick={handleNew} className="text-xs bg-[var(--color-vhs-blau)] text-white px-2 py-1 rounded hover:bg-[var(--color-vhs-blau-80)] flex items-center">
                            <FilePlus className="w-3 h-3 mr-1" aria-hidden="true" /> Neu
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {diagrams.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">Keine Diagramme gespeichert</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {diagrams.map(d => (
                                    <li key={d.id} className="flex items-center hover:bg-[var(--color-vhs-blau-10)] group">
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(d)}
                                            className="flex-1 min-w-0 p-3 flex flex-col text-left"
                                        >
                                            <span className="font-medium text-[var(--color-vhs-blau)] text-sm truncate pr-2">{d.name}</span>
                                            <span className="text-xs text-gray-500">{new Date(d.updatedAt).toLocaleString('de-DE')}</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(d)}
                                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-red-600 hover:text-red-800 p-2 mr-1"
                                            title="Löschen"
                                            aria-label={`„${d.name}“ löschen`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>

        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-[var(--color-vhs-blau-80)] rounded-full transition-colors"
          title="Einstellungen"
          aria-label="Einstellungen"
        >
          <Settings className="w-5 h-5 text-[var(--color-vhs-gelb)]" />
        </button>
      </nav>
    </header>
  );
};

export default Header;
