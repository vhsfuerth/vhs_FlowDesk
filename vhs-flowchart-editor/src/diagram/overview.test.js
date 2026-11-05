import { describe, expect, it } from 'vitest';
import { MINIMAP_SIZE, fitZoom, fromMinimap, isFullyVisible, minimapFrame, toMinimap, unionRects } from './overview';

describe('fitZoom', () => {
  it('verkleinert große Diagramme, bis sie hineinpassen', () => {
    expect(fitZoom({ x: 0, y: 0, width: 2000, height: 500 }, { width: 1040, height: 800 })).toBe(0.48);
  });

  it('richtet sich nach der knapperen Richtung', () => {
    expect(fitZoom({ x: 0, y: 0, width: 400, height: 3000 }, { width: 1000, height: 680 })).toBe(0.2);
  });

  it('vergrößert kleine Diagramme höchstens auf 100 %', () => {
    expect(fitZoom({ x: 0, y: 0, width: 200, height: 100 }, { width: 1000, height: 800 })).toBe(1);
  });

  it('bleibt innerhalb der Zoomgrenzen', () => {
    expect(fitZoom({ x: 0, y: 0, width: 100000, height: 100000 }, { width: 800, height: 600 })).toBe(0.1);
  });
});

describe('isFullyVisible', () => {
  const view = { x: 0, y: 0, width: 1000, height: 800 };
  it('erkennt, ob alles sichtbar ist', () => {
    expect(isFullyVisible({ x: 10, y: 10, width: 500, height: 500 }, view)).toBe(true);
    expect(isFullyVisible({ x: 10, y: 10, width: 1500, height: 500 }, view)).toBe(false);
    expect(isFullyVisible({ x: -50, y: 10, width: 100, height: 100 }, view)).toBe(false);
  });
});

describe('Übersichtskarte', () => {
  const content = { x: 0, y: 0, width: 2000, height: 1000 };
  const view = { x: 500, y: 200, width: 800, height: 600 };
  const frame = minimapFrame(content, view);

  it('passt Inhalt und Ausschnitt in die Karte', () => {
    const all = toMinimap(frame, unionRects([content, view]));
    expect(all.x).toBeGreaterThanOrEqual(0);
    expect(all.y).toBeGreaterThanOrEqual(0);
    expect(all.x + all.width).toBeLessThanOrEqual(MINIMAP_SIZE.width + 0.001);
    expect(all.y + all.height).toBeLessThanOrEqual(MINIMAP_SIZE.height + 0.001);
  });

  it('rechnet Kartenpunkte zurück in Diagrammkoordinaten', () => {
    const r = toMinimap(frame, { x: 1200, y: 300, width: 0, height: 0 });
    const back = fromMinimap(frame, { x: r.x, y: r.y });
    expect(back.x).toBeCloseTo(1200);
    expect(back.y).toBeCloseTo(300);
  });

  it('bezieht einen Ausschnitt außerhalb des Inhalts mit ein', () => {
    const outside = minimapFrame(content, { x: 3000, y: 0, width: 800, height: 600 });
    const v = toMinimap(outside, { x: 3000, y: 0, width: 800, height: 600 });
    expect(v.x + v.width).toBeLessThanOrEqual(MINIMAP_SIZE.width + 0.001);
  });
});
