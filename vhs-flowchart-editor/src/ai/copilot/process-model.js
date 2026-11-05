// @ts-check
// Prozessmodell des KI-Copilots: fachliche Zwischenstufe zwischen KI-Analyse und Diagramm.
// `normalizeProcessModel` macht aus einer beliebigen (auch fehlerhaften) KI-Antwort ein
// vollständiges, in sich stimmiges Modell. Danach sind alle Verweise explizit:
// Jeder Schritt (außer Endpunkten) hat ein gültiges `next` bzw. gültige Zweige,
// `END` steht für „Prozess endet hier“.

import { VARIANT_IDS } from './variants';

/** Verweis auf das automatisch ergänzte Ende. */
export const END = '__ende__';

export const MAX_STEPS = 40;
export const MAX_QUESTIONS = 5;
const MAX_BRANCHES = 4;
const MAX_OPTIONS = 5;
const MAX_ASSUMPTIONS = 8;
/** Name der Lane für Schritte ohne Rolle. */
export const UNASSIGNED_ROLE = 'Ohne Zuordnung';

/** @typedef {'task' | 'decision' | 'end'} StepKind */
/** Art einer Tätigkeit; bestimmt die Form im Diagramm (Prozessschritt, Dokument, IT-System, Warten/Frist) */
/** @typedef {'process' | 'document' | 'system' | 'wait'} TaskType */
/** @typedef {'high' | 'medium' | 'low'} Confidence */

/**
 * @typedef {Object} Branch
 * @property {string} label
 * @property {string} next   ID eines Schritts oder END
 */

/**
 * @typedef {Object} ProcessStep
 * @property {string} id
 * @property {StepKind} kind
 * @property {string} label
 * @property {string} role       leer = keine Zuordnung
 * @property {TaskType} taskType nur bei 'task' von Bedeutung, sonst 'process'
 * @property {string} description  Erläuterung des Schritts (leer = keine)
 * @property {string} document     beteiligtes Dokument/Formular
 * @property {string} system       beteiligtes IT-System
 * @property {string} duration     Dauer bzw. Frist
 * @property {string} next       nur bei 'task': ID oder END
 * @property {Branch[]} branches nur bei 'decision' (mindestens zwei)
 * @property {Confidence} confidence
 * @property {string} note
 */

/**
 * @typedef {Object} ProcessQuestion
 * @property {string} id
 * @property {string} text
 * @property {string[]} options
 * @property {boolean} allowFreeText
 * @property {string} stepId
 */

/**
 * @typedef {Object} ProcessModel
 * @property {string} title
 * @property {string} summary
 * @property {string} trigger     Auslöser, Beschriftung des Startpunkts
 * @property {string[]} roles     nur Rollen, die in Schritten vorkommen
 * @property {ProcessStep[]} steps
 * @property {ProcessQuestion[]} questions
 * @property {string[]} assumptions
 * @property {string | null} recommendedVariant
 */

/** Fehler, wenn sich aus der KI-Antwort gar kein Prozess gewinnen lässt. */
export class ProcessModelError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ProcessModelError';
  }
}

/** @param {unknown} value @returns {value is Record<string, any>} */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Text bereinigen und kürzen.
 * @param {unknown} value
 * @param {number} max
 */
const cleanText = (value, max) => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

/** @type {Record<string, StepKind | 'start'>} */
const KIND_ALIASES = {
  task: 'task', process: 'task', action: 'task', activity: 'task', step: 'task', aufgabe: 'task', schritt: 'task',
  decision: 'decision', gateway: 'decision', condition: 'decision', entscheidung: 'decision', frage: 'decision',
  end: 'end', stop: 'end', ende: 'end', finish: 'end',
  start: 'start', begin: 'start', beginn: 'start'
};

/** Tätigkeiten mit eigener Form; die KI gibt sie als eigene "kind"-Werte an */
/** @type {Record<string, TaskType>} */
const TASK_TYPE_ALIASES = {
  document: 'document', dokument: 'document', formular: 'document', form: 'document',
  system: 'system', 'it-system': 'system', datenablage: 'system', database: 'system',
  wait: 'wait', warten: 'wait', frist: 'wait', delay: 'wait', wartezeit: 'wait'
};

/** Längen der Zusatzangaben */
const DETAIL_LIMITS = { description: 300, document: 80, system: 80, duration: 60 };

/**
 * Zusatzangaben eines Rohschritts (leere Felder bleiben leer).
 * @param {Record<string, any>} step
 */
const readDetails = (step) => ({
  description: cleanText(step.description ?? step.details, DETAIL_LIMITS.description),
  document: cleanText(step.document, DETAIL_LIMITS.document),
  system: cleanText(step.system, DETAIL_LIMITS.system),
  duration: cleanText(step.duration ?? step.deadline, DETAIL_LIMITS.duration)
});

const EXPLICIT_END = /^(end|ende|__ende__|stop)$/i;

/**
 * Liest die Übergänge eines Rohschritts – im aktuellen Format (`transitions`)
 * oder im älteren (`branches` bzw. `next`).
 * @param {Record<string, any>} step
 * @returns {{ label: string, ref: unknown }[]}
 */
function readTransitions(step) {
  const list = Array.isArray(step.transitions) ? step.transitions : Array.isArray(step.branches) ? step.branches : null;
  if (list) {
    return list.filter(isObject).map((t) => ({ label: cleanText(t.label, 40), ref: t.to ?? t.next ?? t.target }));
  }
  const ref = step.next ?? step.to;
  return ref !== undefined && ref !== null && ref !== '' ? [{ label: '', ref }] : [];
}

/**
 * Wandelt eine KI-Antwort in ein vollständiges Prozessmodell um.
 * `warnings` sind für Nutzende formuliert; `issues` beschreiben strukturelle Mängel der
 * KI-Antwort so, dass sie der KI zur Selbstkorrektur zurückgegeben werden können.
 * @param {unknown} raw
 * @returns {{ model: ProcessModel, warnings: string[], issues: string[] }}
 * @throws {ProcessModelError} wenn keine verwertbaren Schritte enthalten sind
 */
export function normalizeProcessModel(raw) {
  if (!isObject(raw)) {
    throw new ProcessModelError('Die Antwort der KI enthält keine Prozessbeschreibung.');
  }

  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const issues = [];
  let trigger = cleanText(raw.trigger, 80);

  // 1. Rohschritte einlesen, Start-Schritte als Auslöser verwenden
  /** @type {Record<string, any>[]} */
  let rawSteps = (Array.isArray(raw.steps) ? raw.steps : []).filter(isObject);
  rawSteps = rawSteps.filter((step) => {
    const kind = KIND_ALIASES[cleanText(step.kind ?? step.type, 20).toLowerCase()];
    if (kind !== 'start') return true;
    if (!trigger) trigger = cleanText(step.label, 80);
    return false;
  });
  if (rawSteps.length === 0) {
    throw new ProcessModelError('Die KI hat in der Beschreibung keine Prozessschritte erkannt.');
  }
  if (rawSteps.length > MAX_STEPS) {
    warnings.push(`Der Prozess ist sehr umfangreich; es wurden nur die ersten ${MAX_STEPS} Schritte übernommen. Teilen Sie ihn besser in Teilprozesse auf.`);
    rawSteps = rawSteps.slice(0, MAX_STEPS);
  }

  // 2. Eindeutige IDs vergeben; Verweise auf doppelte IDs zeigen auf den ersten Schritt
  /** @type {Map<string, string>} */
  const idMap = new Map();
  /** @type {Set<string>} */
  const usedIds = new Set();
  let counter = 0;
  const freshId = () => {
    let id;
    do { counter += 1; id = `s${counter}`; } while (usedIds.has(id) || idMap.has(id));
    return id;
  };
  const ids = rawSteps.map((step) => {
    const original = cleanText(step.id, 40);
    if (original && !usedIds.has(original) && original !== END) {
      usedIds.add(original);
      idMap.set(original, original);
      return original;
    }
    const id = freshId();
    usedIds.add(id);
    return id;
  });

  /**
   * Löst einen Verweis auf; ungültige Verweise ergeben `fallback`.
   * @param {unknown} ref
   * @param {string} fallback
   * @param {string} stepLabel
   */
  const resolveRef = (ref, fallback, stepLabel) => {
    const text = cleanText(ref, 40);
    if (!text) return fallback;
    if (EXPLICIT_END.test(text)) return END;
    const target = idMap.get(text);
    if (target) return target;
    warnings.push(`„${stepLabel}“ verwies auf einen unbekannten Schritt; der Ablauf wurde mit dem folgenden Schritt fortgesetzt.`);
    issues.push(`Schritt „${stepLabel}“ verweist auf die unbekannte id „${text}“.`);
    return fallback;
  };

  // 3. Schritte normalisieren, Verweise explizit machen
  /** @type {Set<string>} Entscheidungen mit weniger als zwei Ausgängen (werden in Schritt 4 repariert) */
  const incompleteDecisions = new Set();

  /** @type {ProcessStep[]} */
  const steps = rawSteps.map((step, index) => {
    const id = ids[index];
    const following = ids[index + 1] || END;
    const label = cleanText(step.label ?? step.name ?? step.text, 120) || 'Unbenannter Schritt';
    const transitions = readTransitions(step);
    const rawKind = cleanText(step.kind ?? step.type, 20).toLowerCase();
    const taskType = /** @type {TaskType} */ (TASK_TYPE_ALIASES[rawKind] || 'process');
    let kind = /** @type {StepKind} */ (KIND_ALIASES[rawKind] || 'task');
    // Mehrere Ausgänge oder eine Frage als Beschriftung: Das ist eine Entscheidung
    if (kind === 'task' && (transitions.length > 1 || label.endsWith('?'))) kind = 'decision';
    const confidence = /** @type {Confidence} */ (['high', 'medium', 'low'].includes(step.confidence) ? step.confidence : 'high');

    /** @type {Branch[]} */
    let branches = [];
    let next = '';

    if (kind === 'decision') {
      branches = transitions
        .slice(0, MAX_BRANCHES)
        .map((t) => ({ label: t.label, next: resolveRef(t.ref, following, label) }));
      if (branches.length === 0) branches = [{ label: '', next: following }];
      if (branches.length < 2) incompleteDecisions.add(id);
      branches.forEach((branch, i) => {
        if (!branch.label && branches.length >= 2) branch.label = branches.length === 2 ? (i === 0 ? 'Ja' : 'Nein') : `Fall ${i + 1}`;
      });
    }

    if (kind === 'task') {
      next = resolveRef(transitions[0]?.ref, following, label);
      if (next === id) {
        warnings.push(`„${label}“ verwies auf sich selbst; der Ablauf wurde mit dem folgenden Schritt fortgesetzt.`);
        issues.push(`Schritt „${label}“ verweist auf sich selbst.`);
        next = following;
      }
    }

    return {
      id,
      kind,
      label,
      role: cleanText(step.role ?? step.lane ?? step.owner, 60),
      taskType: kind === 'task' ? taskType : 'process',
      ...readDetails(step),
      next: kind === 'task' ? next : '',
      branches: kind === 'decision' ? branches : [],
      confidence,
      note: cleanText(step.note, 300)
    };
  });

  // 4. Unvollständige Entscheidungen ergänzen. Der fehlende Zweig führt zum nächsten
  //    Schritt, der sonst nirgends angebunden wäre – meist genau der „Nein“-Weg, den die KI
  //    angelegt, aber nicht verknüpft hat. Von hinten nach vorn, damit innere Entscheidungen
  //    ihren eigenen Nein-Weg zuerst erhalten.
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (!incompleteDecisions.has(step.id)) continue;
    const [existing] = step.branches;
    const reachableNow = collectReachable(steps);
    const candidate = steps.slice(index + 1).find((s) => !reachableNow.has(s.id) && s.id !== existing.next);
    const following = steps[index + 1]?.id || END;
    const target = candidate ? candidate.id : (existing.next === following ? END : following);

    const existingIsNo = /^nein$/i.test(existing.label);
    if (!existing.label) existing.label = 'Ja';
    const otherLabel = existingIsNo ? 'Ja' : (/^ja$/i.test(existing.label) ? 'Nein' : 'Sonst');
    step.branches = [existing, { label: otherLabel, next: target }];
    step.confidence = 'low';

    const targetText = target === END ? 'zum Ende' : `zu „${candidate?.label || steps.find((s) => s.id === target)?.label}“`;
    warnings.push(`„${step.label}“ hatte keinen vollständigen Ja/Nein-Ausgang; „${otherLabel}“ führt jetzt ${targetText}. Bitte prüfen.`);
    issues.push(`Die Entscheidung „${step.label}“ (id ${step.id}) hat weniger als zwei Übergänge. Jede Entscheidung braucht mindestens zwei beschriftete Übergänge (z. B. „Ja“ und „Nein“).`);
  }

  /** @type {Set<string>} */
  const stepIds = new Set(steps.map((s) => s.id));

  // 4. Erreichbarkeit vom ersten Schritt prüfen
  const reachable = collectReachable(steps);
  const unreachable = steps.filter((step) => !reachable.has(step.id));
  if (unreachable.length > 0) {
    unreachable.forEach((step) => issues.push(`Der Schritt „${step.label}“ (id ${step.id}) ist von keinem anderen Schritt aus erreichbar; ein Übergang dorthin fehlt.`));
    warnings.push(`${unreachable.length === 1 ? 'Ein Schritt ist' : `${unreachable.length} Schritte sind`} vom Start aus nicht erreichbar: ${unreachable.map((s) => `„${s.label}“`).join(', ')}.`);
  }

  // 5. Rückfragen, Annahmen, Rollen
  /** @type {ProcessQuestion[]} */
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .filter(isObject)
    .map((question, index) => ({
      id: cleanText(question.id, 20) || `q${index + 1}`,
      text: cleanText(question.text ?? question.question, 200),
      options: (Array.isArray(question.options) ? question.options : [])
        .map((option) => cleanText(option, 80))
        .filter(Boolean)
        .slice(0, MAX_OPTIONS),
      allowFreeText: question.allowFreeText !== false,
      stepId: stepIds.has(cleanText(question.stepId, 40)) ? cleanText(question.stepId, 40) : ''
    }))
    .filter((question) => question.text)
    .slice(0, MAX_QUESTIONS);
  // Doppelte Fragen-IDs vermeiden (Antworten werden darüber zugeordnet)
  const seenQuestionIds = new Set();
  questions.forEach((question, index) => {
    if (seenQuestionIds.has(question.id)) question.id = `q${index + 1}-${index}`;
    seenQuestionIds.add(question.id);
  });

  const assumptions = (Array.isArray(raw.assumptions) ? raw.assumptions : [])
    .map((text) => cleanText(text, 200))
    .filter(Boolean)
    .slice(0, MAX_ASSUMPTIONS);

  /** @type {ProcessModel} */
  const model = {
    title: cleanText(raw.title, 80) || 'KI-Prozess',
    summary: cleanText(raw.summary, 400),
    trigger,
    roles: [],
    steps,
    questions,
    assumptions,
    recommendedVariant: VARIANT_IDS.includes(raw.recommendedVariant) ? raw.recommendedVariant : null
  };
  model.roles = collectRoles(model, Array.isArray(raw.roles) ? raw.roles.map((r) => cleanText(r, 60)) : []);

  return { model, warnings, issues };
}

/**
 * IDs aller vom ersten Schritt aus erreichbaren Schritte.
 * @param {ProcessStep[]} steps
 * @returns {Set<string>}
 */
export function collectReachable(steps) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  /** @type {Set<string>} */
  const seen = new Set();
  const queue = steps.length ? [steps[0].id] : [];
  while (queue.length) {
    const id = /** @type {string} */ (queue.shift());
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    queue.push(...successorsOf(/** @type {ProcessStep} */ (byId.get(id))));
  }
  return seen;
}

/**
 * Direkte Nachfolger eines Schritts (ohne END).
 * @param {ProcessStep} step
 * @returns {string[]}
 */
export function successorsOf(step) {
  const targets = step.kind === 'decision' ? step.branches.map((b) => b.next) : step.kind === 'task' ? [step.next] : [];
  return targets.filter((target) => target && target !== END);
}

/**
 * Rollen in sinnvoller Reihenfolge: zuerst die von der KI genannte, dann nach erstem Auftreten.
 * Rollen ohne Schritt entfallen.
 * @param {Pick<ProcessModel, 'steps'>} model
 * @param {string[]} [preferredOrder]
 * @returns {string[]}
 */
export function collectRoles(model, preferredOrder = []) {
  const used = new Set(model.steps.map((s) => s.role).filter(Boolean));
  /** @type {string[]} */
  const ordered = [];
  [...preferredOrder, ...model.steps.map((s) => s.role)].forEach((role) => {
    if (role && used.has(role) && !ordered.includes(role)) ordered.push(role);
  });
  return ordered;
}

// --- Bearbeitung in der Prüfansicht ---------------------------------------

/** @typedef {{ label?: string, role?: string, taskType?: TaskType, description?: string, document?: string, system?: string, duration?: string }} StepChanges */

/**
 * Ändert Beschriftung, Rolle, Art oder Zusatzangaben eines Schritts.
 * @param {ProcessModel} model
 * @param {string} stepId
 * @param {StepChanges} changes
 * @returns {ProcessModel}
 */
export function updateStep(model, stepId, changes) {
  const steps = model.steps.map((step) => {
    if (step.id !== stepId) return step;
    /** @type {Record<string, string>} */
    const details = {};
    /** @type {(keyof typeof DETAIL_LIMITS)[]} */ (['description', 'document', 'system', 'duration']).forEach((field) => {
      if (changes[field] !== undefined) details[field] = cleanText(changes[field], DETAIL_LIMITS[field]);
    });
    const taskType = changes.taskType && step.kind === 'task' && ['process', 'document', 'system', 'wait'].includes(changes.taskType)
      ? { taskType: changes.taskType } : {};
    return {
      ...step,
      ...(changes.label !== undefined ? { label: cleanText(changes.label, 120) || step.label } : {}),
      ...(changes.role !== undefined ? { role: cleanText(changes.role, 60) } : {}),
      ...taskType,
      ...details
    };
  });
  const next = { ...model, steps };
  return { ...next, roles: collectRoles(next, model.roles) };
}

/**
 * Ändert die Beschriftung eines Entscheidungszweigs.
 * @param {ProcessModel} model
 * @param {string} stepId
 * @param {number} branchIndex
 * @param {string} label
 * @returns {ProcessModel}
 */
export function updateBranchLabel(model, stepId, branchIndex, label) {
  return {
    ...model,
    steps: model.steps.map((step) => (step.id !== stepId ? step : {
      ...step,
      branches: step.branches.map((branch, i) => (i === branchIndex ? { ...branch, label: cleanText(label, 40) || branch.label } : branch))
    }))
  };
}

/**
 * Entfernt einen Schritt. Verweise auf ihn zeigen danach auf seinen Nachfolger
 * (bei Entscheidungen auf das Ziel des ersten Zweigs), sodass der Ablauf zusammenhängend bleibt.
 * Der letzte verbleibende Schritt kann nicht entfernt werden.
 * @param {ProcessModel} model
 * @param {string} stepId
 * @returns {ProcessModel}
 */
export function removeStep(model, stepId) {
  const step = model.steps.find((s) => s.id === stepId);
  if (!step || model.steps.length <= 1) return model;

  let successor = step.kind === 'decision' ? step.branches[0]?.next : step.kind === 'task' ? step.next : END;
  if (!successor || successor === stepId) successor = END;

  /** @param {string} target */
  const redirect = (target) => (target === stepId ? successor : target);

  const steps = model.steps
    .filter((s) => s.id !== stepId)
    .map((s) => ({
      ...s,
      next: s.kind === 'task' ? redirect(s.next) : s.next,
      branches: s.branches.map((b) => ({ ...b, next: redirect(b.next) }))
    }))
    // Ein Schritt, der nach dem Umleiten auf sich selbst zeigt, endet stattdessen
    .map((s) => (s.kind === 'task' && s.next === s.id ? { ...s, next: END } : s));

  const next = {
    ...model,
    steps,
    questions: model.questions.map((q) => (q.stepId === stepId ? { ...q, stepId: '' } : q))
  };
  return { ...next, roles: collectRoles(next, model.roles) };
}

/**
 * Wandelt ein Modell zurück in das Antwortformat der KI (für Verfeinerung und Selbstkorrektur).
 * Rückfragen werden weggelassen.
 * @param {ProcessModel} model
 */
export function toRawModel(model) {
  /** @param {string} target */
  const ref = (target) => (target === END ? 'END' : target);
  return {
    title: model.title,
    summary: model.summary,
    trigger: model.trigger,
    roles: model.roles,
    steps: model.steps.map((step) => ({
      id: step.id,
      label: step.label,
      kind: step.kind === 'task' && step.taskType && step.taskType !== 'process' ? step.taskType : step.kind,
      role: step.role,
      ...(step.description ? { description: step.description } : {}),
      ...(step.document ? { document: step.document } : {}),
      ...(step.system ? { system: step.system } : {}),
      ...(step.duration ? { duration: step.duration } : {}),
      transitions: step.kind === 'decision'
        ? step.branches.map((b) => ({ label: b.label, to: ref(b.next) }))
        : step.kind === 'task' ? [{ label: '', to: ref(step.next) }] : [],
      confidence: step.confidence,
      ...(step.note ? { note: step.note } : {})
    })),
    assumptions: model.assumptions
  };
}
