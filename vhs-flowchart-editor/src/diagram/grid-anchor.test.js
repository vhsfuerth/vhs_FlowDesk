import { describe, expect, it } from 'vitest';
import { GRID_ANCHOR, snapToGridAnchor } from './grid-anchor';
import { placeNextNode } from './add-next';
import { createNodeAt } from './shapes';

const center = (r) => r.x + r.width / 2;

describe('Einrasten im Raster', () => {
  it('rastet standardmäßig die Mitte ein', () => {
    expect(GRID_ANCHOR).toBe('center');
    // 175 breit: Mitte 87,5 + 3 → 90,5 → 90
    expect(snapToGridAnchor({ x: 3, y: 0, width: 175, height: 60 })).toEqual({ x: 2.5, y: 0 });
  });

  it('legt unterschiedlich breite Elemente mittig übereinander', () => {
    const a = { x: 0, y: 0, width: 160, height: 60 };
    // grob darunter gezogen (Mitte 82,5 statt 80)
    const b = { x: -15, y: 200, width: 195, height: 76 };
    const sa = { ...a, ...snapToGridAnchor(a) };
    const sb = { ...b, ...snapToGridAnchor(b) };
    expect(center(sa)).toBe(center(sb));
  });

  it('kann auf die linke obere Ecke zurückgestellt werden (Verhalten bis 1.6.2)', () => {
    expect(snapToGridAnchor({ x: 3, y: 14, width: 175, height: 60 }, { anchor: 'topLeft' })).toEqual({ x: 0, y: 10 });
  });

  it('setzt einen anders breiten Folgeschritt mittig unter die Quelle', () => {
    const source = { x: 0, y: 0, width: 160, height: 60 };
    const size = { width: 195, height: 76 };
    const placed = placeNextNode(source, size, 'bottom', []);
    expect(center({ ...placed, ...size })).toBe(center(source));
  });

  it('setzt neu eingefügte Elemente mit der Mitte aufs Raster', () => {
    const node = createNodeAt('process', 203, 117);
    const box = node.getBBox();
    expect((box.x + box.width / 2) % 10).toBe(0);
    expect((box.y + box.height / 2) % 10).toBe(0);
  });
});
