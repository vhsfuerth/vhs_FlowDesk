import React, { useState, useCallback } from 'react';
import { ChevronRight, Play, RotateCcw, Download, CheckCircle2, Footprints } from 'lucide-react';

const SimulationPanel = ({ diagramData, onFocusNode, onSetSimulationFocus }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [path, setPath] = useState([]); // [{nodeId, label, choiceLabel}]

  const nodes = diagramData?.nodes || [];
  const edges = diagramData?.edges || [];

  const getNode = (nodeId) => nodes.find((n) => n.id === nodeId);
  const getOutgoing = (nodeId) => edges.filter((e) => e.from === nodeId);

  const currentNode = currentNodeId ? getNode(currentNodeId) : null;
  const outgoing = currentNodeId ? getOutgoing(currentNodeId) : [];
  const isFinished = isActive && currentNode?.type === 'end';
  const isDecision = currentNode?.type === 'decision';
  const canStart = nodes.some((n) => n.type === 'start');

  const startSimulation = useCallback(() => {
    const startNode = nodes.find((n) => n.type === 'start');
    if (!startNode) return;
    setCurrentNodeId(startNode.id);
    setPath([{ nodeId: startNode.id, label: startNode.label, choiceLabel: '' }]);
    setIsActive(true);
    onFocusNode(startNode.id);
    if (onSetSimulationFocus) onSetSimulationFocus(startNode.id);
  }, [nodes, onFocusNode, onSetSimulationFocus]);

  const stopSimulation = useCallback(() => {
    setIsActive(false);
    setCurrentNodeId(null);
    setPath([]);
    if (onSetSimulationFocus) onSetSimulationFocus(null);
  }, [onSetSimulationFocus]);

  const advanceTo = useCallback((edge) => {
    const nextNode = getNode(edge.to);
    if (!nextNode) return;
    setCurrentNodeId(nextNode.id);
    setPath((prev) => [...prev, { nodeId: nextNode.id, label: nextNode.label, choiceLabel: edge.label || '' }]);
    onFocusNode(nextNode.id);
    if (onSetSimulationFocus) onSetSimulationFocus(nextNode.id);
  }, [nodes, edges, onFocusNode, onSetSimulationFocus]);

  const exportPath = () => {
    const lines = [
      `Simulierter Pfad: ${path[0]?.label || 'Unbekannt'} – ${new Date().toLocaleDateString('de-DE')}`,
      '',
      ...path.map((step, i) => {
        const prefix = step.choiceLabel ? ` [${step.choiceLabel}]` : '';
        return `${i + 1}. ${step.label}${prefix}`;
      })
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation-pfad.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <section className="rounded-xl border border-[var(--color-vhs-blau-20)] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-black text-gray-400">Interaktiv</div>
          <div className="mt-1 text-lg font-bold text-[var(--color-vhs-blau)]">Prozess-Simulation</div>
        </div>
        {!isActive ? (
          <button
            onClick={startSimulation}
            disabled={!canStart}
            className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--color-vhs-blau)] text-white text-sm font-bold hover:bg-[var(--color-vhs-blau-80)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-1" />
            Starten
          </button>
        ) : (
          <button
            onClick={stopSimulation}
            className="inline-flex items-center px-3 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-300"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Zurücksetzen
          </button>
        )}
      </div>

      {!isActive && (
        <p className="text-sm text-gray-500 mb-3">
          Spiele Szenarien durch: Wähle bei Entscheidungsknoten den entsprechenden Pfad und verfolge die Prozesskette Schritt für Schritt.
        </p>
      )}

      {isActive && (
        <>
          {/* Current node card */}
          <div className={`rounded-lg border-2 p-3 mb-3 ${isFinished ? 'border-green-400 bg-green-50' : isDecision ? 'border-[var(--color-vhs-orange)] bg-orange-50' : 'border-[var(--color-vhs-blau)] bg-[var(--color-vhs-blau-10)]'}`}>
            <div className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">
              {isFinished ? 'Ziel erreicht' : isDecision ? 'Entscheidung erforderlich' : 'Aktueller Schritt'}
            </div>
            <div className="font-bold text-[var(--color-vhs-blau)] text-sm">
              {currentNode?.label || '–'}
            </div>
          </div>

          {/* Decision choices */}
          {isDecision && outgoing.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-500 mb-2">Welchen Weg nehmen?</div>
              <div className="space-y-2">
                {outgoing.map((edge) => {
                  const target = getNode(edge.to);
                  return (
                    <button
                      key={edge.id || `${edge.from}-${edge.to}`}
                      onClick={() => advanceTo(edge)}
                      className="w-full text-left rounded-lg border border-[var(--color-vhs-orange)] bg-white px-3 py-2 text-sm font-bold text-[var(--color-vhs-blau)] hover:bg-orange-50 flex items-center justify-between"
                    >
                      <span>{edge.label || '(kein Label)'}</span>
                      <span className="text-xs text-gray-400 font-normal ml-2 truncate">→ {target?.label || '?'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single-path advance (non-decision) */}
          {!isDecision && !isFinished && outgoing.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => advanceTo(outgoing[0])}
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-vhs-blau)] bg-white text-sm font-bold text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
              >
                <span>Weiter</span>
                <span className="text-xs text-gray-400 font-normal ml-2 truncate">→ {getNode(outgoing[0].to)?.label || '?'}</span>
                <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
              </button>
            </div>
          )}

          {/* Dead-end warning */}
          {!isDecision && !isFinished && outgoing.length === 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              Kein weiterer Ausgang gefunden. Prüfe die Verbindungen im Diagramm.
            </div>
          )}

          {/* Finished */}
          {isFinished && (
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Simulation abgeschlossen – {path.length} Schritte durchlaufen.
            </div>
          )}

          {/* Path breadcrumb */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1 mb-2">
              <Footprints className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">
                Pfad ({path.length} Schritte)
              </span>
            </div>
            <ol className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
              {path.map((step, i) => (
                <li
                  key={i}
                  onClick={() => onFocusNode(step.nodeId)}
                  className={`flex items-center gap-2 text-xs rounded px-2 py-1 cursor-pointer hover:bg-gray-50 ${i === path.length - 1 ? 'font-bold text-[var(--color-vhs-blau)] bg-[var(--color-vhs-blau-10)]' : 'text-gray-600'}`}
                >
                  <span className="shrink-0 text-gray-400">{i + 1}.</span>
                  <span className="truncate">{step.label}</span>
                  {step.choiceLabel && (
                    <span className="shrink-0 text-[var(--color-vhs-orange)] font-normal">[{step.choiceLabel}]</span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {path.length > 1 && (
            <button
              onClick={exportPath}
              className="mt-3 inline-flex items-center px-3 py-2 rounded-md border border-[var(--color-vhs-blau)] text-[var(--color-vhs-blau)] text-xs font-bold hover:bg-[var(--color-vhs-blau-10)]"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Pfad exportieren (TXT)
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default SimulationPanel;
