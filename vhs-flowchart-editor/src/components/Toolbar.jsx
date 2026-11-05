import { Play, CircleStop, Square, Diamond, MessageSquareDashed, FileText, Database, Layers, Hourglass, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Search, ChevronDown, ChevronUp, Rows3 } from 'lucide-react';
import { useState } from 'react';

const Toolbar = ({ onDragStart, onAddNode, isCollapsed, onToggleCollapsed, validation, onFocusNode }) => {
  const [isCheckCollapsed, setIsCheckCollapsed] = useState(false);

  const severityClasses = {
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const tools = [
    { type: 'start', icon: Play, label: 'Start', color: 'text-[var(--color-vhs-gelb)]' },
    { type: 'end', icon: CircleStop, label: 'Ende', color: 'text-[var(--color-vhs-orange)]' },
    { type: 'process', icon: Square, label: 'Prozess', color: 'text-[var(--color-vhs-blau)]' },
    { type: 'decision', icon: Diamond, label: 'Entscheidung', color: 'text-[var(--color-vhs-orange-hell)]' },
    { type: 'document', icon: FileText, label: 'Dokument/Formular', color: 'text-[var(--color-vhs-hellblau-b)]' },
    { type: 'system', icon: Database, label: 'IT-System', color: 'text-[var(--color-vhs-violett)]' },
    { type: 'wait', icon: Hourglass, label: 'Warten/Frist', color: 'text-[var(--color-vhs-orange-hell)]' },
    { type: 'subprocess', icon: Layers, label: 'Teilprozess', color: 'text-[var(--color-vhs-blau)]' },
    { type: 'annotation', icon: MessageSquareDashed, label: 'Kommentar', color: 'text-[var(--color-vhs-blau-60)]' },
    { type: 'lane', icon: Rows3, label: 'Swimlane', color: 'text-[var(--color-vhs-blau-40)]' }
  ];

  const handleDragStart = (event, tool) => {
    const nodeData = {
      type: tool.type,
      label: tool.label
    };
    event.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'copy';
    if (onDragStart) onDragStart(nodeData);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-[var(--color-vhs-blau-20)] flex flex-col items-center shadow-sm shrink-0">
        <button
          onClick={onToggleCollapsed}
          className="mt-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)]"
          title="Elementleiste einblenden"
          aria-label="Elementleiste einblenden"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Elemente
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white w-72 border-r border-[var(--color-vhs-blau-20)] flex flex-col shadow-sm shrink-0">
      <div className="p-4 border-b border-[var(--color-vhs-blau-10)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-[var(--color-vhs-blau)] text-sm uppercase tracking-wider">
              Elemente
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Ziehe Elemente auf die Arbeitsfläche oder klicke sie an
            </p>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-vhs-blau-20)] text-[var(--color-vhs-blau)] hover:bg-[var(--color-vhs-blau-10)] shrink-0"
            title="Elementleiste ausblenden"
            aria-label="Elementleiste ausblenden"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="space-y-3 mb-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                type="button"
                key={tool.type}
                draggable
                onDragStart={(event) => handleDragStart(event, tool)}
                onClick={() => onAddNode?.(tool.type)}
                className="w-full text-left flex items-center p-3 rounded-md border border-[var(--color-vhs-blau-20)] bg-white hover:bg-[var(--color-vhs-blau-10)] cursor-grab active:cursor-grabbing transition-colors group shadow-sm"
                title={`${tool.label} hinzufügen (ziehen oder klicken)`}
              >
                <div className="mr-3 p-2 rounded bg-gray-50 group-hover:bg-white transition-colors" aria-hidden="true">
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700 select-none">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {validation && (
          <div className="mt-auto pt-4 border-t border-[var(--color-vhs-blau-10)]">
            <section className="rounded-xl border border-[var(--color-vhs-blau-20)] overflow-hidden bg-white">
              <button
                onClick={() => setIsCheckCollapsed(!isCheckCollapsed)}
                aria-expanded={!isCheckCollapsed}
                className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="shrink-0">
                    {validation.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[var(--color-vhs-orange)]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Struktur-Check</div>
                    <div className="text-sm font-bold text-[var(--color-vhs-blau)] leading-tight">
                      {validation.isValid ? 'Diagramm valide' : 'Hinweise prüfen'}
                    </div>
                  </div>
                </div>
                {isCheckCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-vhs-blau)]" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-vhs-blau)]" />
                )}
              </button>

              {!isCheckCollapsed && (
                <div className="px-3 pb-3 pt-2 space-y-3 border-t border-gray-50">
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] font-black uppercase tracking-wider">
                    <div className="rounded bg-red-50 text-red-700 p-1.5 border border-red-100">
                      {validation.counts.error} Fehler
                    </div>
                    <div className="rounded bg-amber-50 text-amber-700 p-1.5 border border-amber-100">
                      {validation.counts.warning} Warn.
                    </div>
                    <div className="rounded bg-blue-50 text-blue-700 p-1.5 border border-blue-100">
                      {validation.counts.info} Hinw.
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                    {validation.findings.length === 0 ? (
                      <div className="rounded border border-green-200 bg-green-50 p-2 text-[10px] text-green-700 font-medium text-center italic">
                        Keine Strukturmängel gefunden.
                      </div>
                    ) : (
                      validation.findings.map((finding, index) => (
                        <button
                          key={`${finding.code}-${index}`}
                          onClick={() => finding.nodeId && onFocusNode(finding.nodeId)}
                          disabled={!finding.nodeId}
                          className={`w-full text-left rounded border p-2 transition-all ${severityClasses[finding.severity]} ${finding.nodeId ? 'hover:shadow-sm hover:translate-x-0.5 active:translate-x-0' : 'cursor-default'} border-opacity-40 shadow-xs`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-[11px] leading-tight">{finding.message}</div>
                            {finding.nodeId ? <Search className="w-3 h-3 shrink-0 opacity-40" /> : null}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

    </aside>
  );
};

export default Toolbar;
