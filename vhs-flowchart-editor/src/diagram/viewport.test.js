import { describe, expect, it, vi } from 'vitest';
import { clampZoom, fitPaperToContent, fragmentBounds, pasteOffset, scrollToLocalRect, wheelZoomFactor, zoomAroundPoint } from './viewport';
import { findMatches, normalizeSearchText } from './search';

const container = (overrides = {}) => ({
  clientWidth: 800,
  clientHeight: 600,
  scrollLeft: 0,
  scrollTop: 0,
  getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }),
  ...overrides
});

// Minimales Paper: Skalierung s und Verschiebung (tx, ty); Container liegt bei (100, 50)
const fakePaper = (c, { s = 1, tx = 0, ty = 0 } = {}) => {
  const state = { s, tx, ty };
  return {
    state,
    scale: vi.fn((value) => { state.s = value; }),
    translate: () => ({ tx: state.tx, ty: state.ty }),
    fitToContent: vi.fn(),
    clientToLocalPoint: (x, y) => ({ x: (x - 100 + c.scrollLeft - state.tx) / state.s, y: (y - 50 + c.scrollTop - state.ty) / state.s }),
    localToClientPoint: (x, y) => ({ x: x * state.s + state.tx + 100 - c.scrollLeft, y: y * state.s + state.ty + 50 - c.scrollTop }),
    localToPaperRect: (r) => ({ x: r.x * state.s + state.tx, y: r.y * state.s + state.ty, width: r.width * state.s, height: r.height * state.s })
  };
};

describe('Zoom', () => {
  it('begrenzt und rundet die Zoomstufe', () => {
    expect(clampZoom(5)).toBe(2);
    expect(clampZoom(0.01)).toBe(0.1);
    expect(clampZoom(1.23456)).toBe(1.23);
  });

  it('zoomt beim Mausrad in kleinen, symmetrischen Schritten', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1.1);
    expect(wheelZoomFactor(-100)).toBeLessThan(1.2);
    expect(wheelZoomFactor(100) * wheelZoomFactor(-100)).toBeCloseTo(1);
    // Große Ausschläge werden begrenzt, Touchpad-Werte bleiben fein
    expect(wheelZoomFactor(-1000)).toBe(wheelZoomFactor(-100));
    expect(wheelZoomFactor(-4)).toBeLessThan(1.01);
  });

  it('hält den Punkt unter der Maus beim Zoomen fest', () => {
    const c = container({ scrollLeft: 200, scrollTop: 100 });
    const paper = fakePaper(c);
    const mouse = { x: 500, y: 300 };
    const before = paper.clientToLocalPoint(mouse.x, mouse.y);

    zoomAroundPoint(paper, c, 1.5, mouse);

    expect(paper.scale).toHaveBeenCalledWith(1.5, 1.5);
    const after = paper.localToClientPoint(before.x, before.y);
    expect(after.x).toBeCloseTo(mouse.x);
    expect(after.y).toBeCloseTo(mouse.y);
  });
});

describe('Größe der Arbeitsfläche', () => {
  it('gleicht eine Verschiebung des Ursprungs beim Scrollen aus', () => {
    const c = container({ scrollLeft: 50, scrollTop: 20 });
    const paper = fakePaper(c);
    paper.fitToContent.mockImplementation(() => { paper.state.tx = 300; paper.state.ty = 100; });

    fitPaperToContent(paper, c, 400);

    expect(paper.fitToContent).toHaveBeenCalledWith(expect.objectContaining({ allowNewOrigin: 'any', padding: 400, minWidth: 800, minHeight: 600 }));
    expect(c.scrollLeft).toBe(350);
    expect(c.scrollTop).toBe(120);
  });

  it('scrollt Bereiche mittig oder bündig in den sichtbaren Ausschnitt', () => {
    const c = container();
    const paper = fakePaper(c, { s: 2, tx: 100, ty: 0 });
    scrollToLocalRect(paper, c, { x: 100, y: 100, width: 50, height: 50 }, 'center');
    expect(c.scrollLeft).toBe(100 * 2 + 100 + 50 - 400);
    expect(c.scrollTop).toBe(200 + 50 - 300);
    scrollToLocalRect(paper, c, { x: 100, y: 100, width: 50, height: 50 }, 'topLeft');
    expect(c.scrollLeft).toBe(300 - 20);
    expect(c.scrollTop).toBe(200 - 20);
  });
});

describe('Einfügen an der Mausposition', () => {
  const fragment = {
    nodes: [
      { id: 'a', position: { x: 0, y: 0 }, size: { width: 100, height: 50 } },
      { id: 'b', position: { x: 200, y: 100 }, size: { width: 100, height: 50 } }
    ]
  };

  it('ermittelt den Umriss eines Ausschnitts', () => {
    expect(fragmentBounds(fragment)).toEqual({ x: 0, y: 0, width: 300, height: 150 });
    expect(fragmentBounds({ nodes: [] })).toBeNull();
  });

  it('setzt den Ausschnitt mittig auf das Ziel und rastet ein', () => {
    expect(pasteOffset(fragment, { x: 1000, y: 500 })).toEqual({ x: 850, y: 430 });
    expect(pasteOffset(fragment, { x: 1003, y: 504 })).toEqual({ x: 850, y: 430 });
  });

  it('versetzt wiederholtes Einfügen an derselben Stelle', () => {
    expect(pasteOffset(fragment, { x: 1000, y: 500 }, 2)).toEqual({ x: 910, y: 490 });
  });
});

describe('Suche', () => {
  const nodes = [
    { id: 'unten', type: 'process', label: 'Antrag ablegen', position: { x: 0, y: 300 } },
    { id: 'rechts', type: 'process', label: 'ANTRAG\nprüfen', position: { x: 400, y: 100 } },
    { id: 'links', type: 'decision', label: 'Antrag vollständig?', position: { x: 0, y: 105 } },
    { id: 'anders', type: 'end', label: 'Ende', position: { x: 0, y: 0 } }
  ];

  it('findet Treffer unabhängig von Groß-/Kleinschreibung in Leserichtung', () => {
    expect(findMatches(nodes, 'antrag')).toEqual(['links', 'rechts', 'unten']);
    expect(findMatches(nodes, 'antrag prüfen')).toEqual(['rechts']);
  });

  it('liefert ohne Suchbegriff nichts', () => {
    expect(findMatches(nodes, '   ')).toEqual([]);
  });

  it('vereinheitlicht Leerraum und Akzente, Umlaute bleiben', () => {
    expect(normalizeSearchText('  Café\n  Prüfung ')).toBe('cafe prüfung');
  });
});
