import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Calendar, Edit3 } from 'lucide-react';
import { indexeddb } from '../storage/indexeddb';

const DiagramListModal = ({ isOpen, onClose, onSelect }) => {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDiagrams();
    }
  }, [isOpen]);

  const loadDiagrams = async () => {
    setLoading(true);
    try {
      const all = await indexeddb.getAllDiagrams();
      setDiagrams(all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch (err) {
      console.error("Failed to load diagrams:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Diagramm unwiderruflich löschen?')) {
      await indexeddb.deleteDiagram(id);
      loadDiagrams();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-bold flex items-center text-[var(--color-vhs-blau)]">
            <FolderOpen className="w-5 h-5 mr-2" />
            Gespeicherte Diagramme
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center p-8 text-gray-400">Lädt...</div>
          ) : diagrams.length === 0 ? (
            <div className="text-center p-12">
              <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Noch keine Diagramme gespeichert.</p>
              <p className="text-sm text-gray-400 mt-1">Klicken Sie auf "Speichern" in der Editor-Leiste.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {diagrams.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    onSelect(d);
                    onClose();
                  }}
                  className="group relative flex items-center p-4 border border-gray-200 rounded-lg hover:border-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex-1 pr-8">
                    <h3 className="font-bold text-[var(--color-vhs-blau)] flex items-center">
                      {d.name}
                    </h3>
                    <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Bearbeitet: {new Date(d.updatedAt).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, d.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all absolute right-2"
                    title="Löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
           >
             Schließen
           </button>
        </div>
      </div>
    </div>
  );
};

export default DiagramListModal;
