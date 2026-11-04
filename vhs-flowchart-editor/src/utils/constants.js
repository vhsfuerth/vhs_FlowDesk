export const COLORS = {
  vhsBlue: '#00285a',
  vhsBlue80: '#375578',
  vhsBlue60: '#69829b',
  vhsBlue40: '#9baabe',
  vhsBlue20: '#cdd7dc',
  vhsBlue10: '#e6ebf0',

  vhsYellow: '#fab90f',
  vhsYellowB: '#ff9100',
  
  vhsOrangeHell: '#f7a746',
  vhsOrangeHellB: '#a25c2e',

  vhsRed: '#e1000f',
  vhsRedB: '#8c0a23',

  vhsGreen: '#afc805',
  vhsGreenB: '#4ba02d',

  vhsViolet: '#7d5aa5',
  vhsVioletB: '#371964',

  vhsLightBlue: '#64b9e6',
  vhsLightBlueB: '#1e73af',

  vhsOrange: '#eb640f',
  vhsOrangeB: '#b42d0f',

  white: '#ffffff',
  black: '#000000',
};

// Farben für Swimlanes: Kopfzeile in einer vhs-Farbe, Fläche als helle Abstufung.
// „Türkis“ ist keine Farbe aus dem Styleguide, bleibt aber für bestehende Diagramme wählbar.
export const LANE_COLORS = [
  { id: 'blue', label: 'Blau', header: COLORS.vhsBlue, body: '#EEF4F7' },
  { id: 'green', label: 'Grün', header: COLORS.vhsGreenB, body: '#f0f7eb' },
  { id: 'orange', label: 'Orange', header: COLORS.vhsOrange, body: '#fef3ea' },
  { id: 'violet', label: 'Violett', header: COLORS.vhsViolet, body: '#f4f0f9' },
  { id: 'lightblue', label: 'Hellblau', header: COLORS.vhsLightBlueB, body: '#e8f4fc' },
  { id: 'red', label: 'Rot', header: COLORS.vhsRedB, body: '#fdeef0' },
  { id: 'teal', label: 'Türkis', header: '#1a8070', body: '#e8f5f3' },
];

export const FONTS = {
  primary: 'Arial, Calibri, Helvetica, sans-serif',
};

// Shape configurations
export const SHAPE_CONFIG = {
  START: { width: 120, height: 60, rx: 30, ry: 30 },
  END: { width: 120, height: 60, rx: 30, ry: 30 },
  PROCESS: { width: 160, height: 60 },
  DECISION: { width: 180, height: 80 },
  ANNOTATION: { width: 200, height: 100 }
};

export const GRID_SIZE = 10;

// Markierungen im Versionsvergleich (vhs Grün B, Gelb, Rot)
export const COMPARE_MARKS = {
  added: { label: 'Neu', color: '#4BA02D', width: 4 },
  changed: { label: 'Geändert', color: '#FAB90F', width: 4 },
  removed: { label: 'Entfernt', color: '#E1000F', width: 3, dash: '6,4', opacity: 0.45 },
  moved: { label: 'Verschoben', color: '#69829B', width: 0 }
};
