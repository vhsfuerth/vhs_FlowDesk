import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Minimap from './Minimap';

const overview = {
  items: [
    { id: 'l1', lane: true, x: 0, y: 0, width: 2000, height: 400 },
    { id: 'n1', lane: false, x: 100, y: 100, width: 160, height: 60 }
  ],
  content: { x: 0, y: 0, width: 2000, height: 400 },
  view: { x: 0, y: 0, width: 800, height: 400 }
};

afterEach(() => cleanup());

describe('Minimap', () => {
  it('zeigt Elemente und den sichtbaren Ausschnitt', () => {
    render(<Minimap overview={overview} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByTestId('minimap').querySelectorAll('rect')).toHaveLength(3);
  });

  it('navigiert beim Klicken auf die Karte', () => {
    const onNavigate = vi.fn();
    render(<Minimap overview={overview} onNavigate={onNavigate} onClose={() => {}} />);
    fireEvent.pointerDown(screen.getByTestId('minimap-map'), { clientX: 100, clientY: 50 });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls[0][0]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('lässt sich ausblenden', () => {
    const onClose = vi.fn();
    render(<Minimap overview={overview} onNavigate={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Übersichtskarte ausblenden' }));
    expect(onClose).toHaveBeenCalled();
  });
});
