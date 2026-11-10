import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import MinimapOverlay from './MinimapOverlay';
import { createOverviewStore } from '../diagram/overview-tracking';

const overview = {
  items: [{ id: 'n1', lane: false, x: 100, y: 100, width: 160, height: 60 }],
  content: { x: 0, y: 0, width: 2000, height: 400 },
  view: { x: 0, y: 0, width: 500, height: 300 }
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MinimapOverlay', () => {
  it('erscheint nur, wenn nicht alles sichtbar ist', () => {
    const store = createOverviewStore();
    render(<MinimapOverlay store={store} onNavigate={() => {}} />);
    expect(screen.queryByTestId('minimap')).toBeNull();
    act(() => store.set({ ...overview, view: { x: -10, y: -10, width: 3000, height: 1000 } }));
    expect(screen.queryByTestId('minimap')).toBeNull();
    act(() => store.set(overview));
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });

  it('lässt sich aus- und wieder einblenden und merkt sich das', () => {
    const store = createOverviewStore();
    store.set(overview);
    const { unmount } = render(<MinimapOverlay store={store} onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Übersichtskarte ausblenden' }));
    expect(screen.queryByTestId('minimap')).toBeNull();
    unmount();
    render(<MinimapOverlay store={store} onNavigate={() => {}} />);
    expect(screen.queryByTestId('minimap')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Übersicht' }));
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });
});
