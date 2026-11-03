// Beispielantworten der KI für Tests des KI-Copilots

/** Gut strukturierte KI-Antwort (Kursanmeldung mit Warteliste). */
export const GOOD_RESPONSE = {
  title: 'Kursanmeldung',
  summary: 'Anmeldungen werden geprüft und bestätigt oder auf die Warteliste gesetzt.',
  trigger: 'Anmeldung geht ein',
  roles: ['Teilnehmende', 'Verwaltung'],
  steps: [
    { id: 's1', kind: 'task', label: 'Anmeldung online absenden', role: 'Teilnehmende', next: 's2' },
    { id: 's2', kind: 'decision', label: 'Kurs noch frei?', role: 'Verwaltung', branches: [{ label: 'Ja', next: 's3' }, { label: 'Nein', next: 's5' }] },
    { id: 's3', kind: 'task', label: 'Bestätigung senden', role: 'Verwaltung', next: 's4', confidence: 'low', note: 'Versandweg unklar.' },
    { id: 's4', kind: 'end', label: 'Platz gebucht' },
    { id: 's5', kind: 'task', label: 'Auf Warteliste setzen', role: 'Verwaltung', next: 'END' }
  ],
  questions: [{ id: 'q1', stepId: 's3', text: 'Wie wird bestätigt?', options: ['E-Mail', 'Brief'], allowFreeText: true }],
  assumptions: ['Zahlung ist nicht Teil des Prozesses.'],
  recommendedVariant: 'buergernah'
};
