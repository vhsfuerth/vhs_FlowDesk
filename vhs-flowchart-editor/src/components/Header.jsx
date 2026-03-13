import React, { useState, useEffect } from 'react';
import { Settings, FilePlus, FolderOpen, Edit2, Check, LayoutTemplate, BookOpen } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';
import { setLastDiagramId } from '../storage/settings';

const Header = ({ onSettingsClick, currentDiagram, onNewDiagram, onDiagramSelect, onRename, onTemplateOpen, onGuideOpen }) => {
  const [diagrams, setDiagrams] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (currentDiagram) setTempName(currentDiagram.name);
  }, [currentDiagram]);

  useEffect(() => {
     loadDiagrams();
  }, [isMenuOpen]);

  const loadDiagrams = async () => {
      const all = await indexeddb.getAllDiagrams();
      setDiagrams(all.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  };

  const handleSelect = (dgrm) => {
      setIsMenuOpen(false);
      setLastDiagramId(dgrm.id);
      onDiagramSelect(dgrm);
  };

  const handleNew = () => {
      setIsMenuOpen(false);
      onNewDiagram();
  };

  const handleDelete = async (e, id) => {
      e.stopPropagation();
      if(window.confirm('Diagramm wirklich löschen?')) {
          await indexeddb.deleteDiagram(id);
          loadDiagrams();
      }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onRename(tempName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <header className="bg-[var(--color-vhs-blau)] text-white shadow-md w-full h-16 flex items-center justify-between px-6 z-40 relative border-b border-white/10">
      <div className="flex items-center space-x-4">
        <div className="bg-white rounded p-1 overflow-hidden h-10 flex items-center shadow-md">
             <img src="/Logo_HQ_pos.png" alt="vhs Logo" className="h-full w-auto object-contain px-1" />
        </div>
        <div className="flex flex-col justify-center border-l border-white/20 pl-4">
            <h1 className="text-sm font-black uppercase tracking-widest text-[var(--color-vhs-blau-20)] leading-none mb-1">Workflow Editor</h1>
            <div className="flex items-center group">
              {isEditingName ? (
                <div className="flex items-center">
                  <input
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="bg-white/10 text-white font-bold border-b border-[var(--color-vhs-gelb)] focus:outline-none px-1 h-6 max-w-[250px]"
                  />
                  <Check className="w-4 h-4 ml-1 text-[var(--color-vhs-gelb)] cursor-pointer" onClick={handleSaveName} />
                </div>
              ) : (
                <div className="flex items-center cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <span className="text-lg font-bold leading-none truncate max-w-[300px]">
                    {currentDiagram?.name || 'Unbenanntes Diagramm'}
                  </span>
                  <Edit2 className="w-3 h-3 ml-2 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onTemplateOpen}
          className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
        >
          <LayoutTemplate className="w-4 h-4 mr-2" />
          Vorlagen
        </button>
        <button
          onClick={onGuideOpen}
          className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Anleitung
        </button>

        <div className="relative">
            <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center px-4 py-2 hover:bg-[var(--color-vhs-blau-80)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--color-vhs-blau-60)]"
            >
            <FolderOpen className="w-4 h-4 mr-2" />
            Diagramme
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-md shadow-xl overflow-hidden border border-gray-100 z-50 text-gray-800">
                    <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-600">Gespeicherte Diagramme</span>
                        <button onClick={handleNew} className="text-xs bg-[var(--color-vhs-blau)] text-white px-2 py-1 rounded hover:bg-[var(--color-vhs-blau-80)] flex items-center">
                            <FilePlus className="w-3 h-3 mr-1"/> Neu
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {diagrams.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">Keine Diagramme gespeichert</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {diagrams.map(d => (
                                    <li key={d.id} 
                                        onClick={() => handleSelect(d)}
                                        className="p-3 flex flex-col hover:bg-[var(--color-vhs-blau-10)] cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-[var(--color-vhs-blau)] text-sm truncate pr-2">{d.name}</span>
                                            <button 
                                                onClick={(e) => handleDelete(e, d.id)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                                                title="Löschen"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                            </button>
                                        </div>
                                        <span className="text-xs text-gray-500">{new Date(d.updatedAt).toLocaleString()}</span>
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
      </div>
    </header>
  );
};

export default Header;
