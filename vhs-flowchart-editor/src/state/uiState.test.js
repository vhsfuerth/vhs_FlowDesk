import { describe, expect, it } from 'vitest';
import { MODALS, QUALITY_PANEL_MAX_WIDTH, QUALITY_PANEL_MIN_WIDTH, initialUiState, uiReducer } from './uiState';

describe('uiReducer', () => {
  it('öffnet und schließt Dialoge (immer nur einer gleichzeitig)', () => {
    let state = uiReducer(initialUiState, { type: 'openModal', modal: MODALS.SETTINGS });
    expect(state.openModal).toBe(MODALS.SETTINGS);
    state = uiReducer(state, { type: 'openModal', modal: MODALS.GUIDE });
    expect(state.openModal).toBe(MODALS.GUIDE);
    state = uiReducer(state, { type: 'closeModal' });
    expect(state.openModal).toBeNull();
  });

  it('klappt Seitenleisten ein und aus', () => {
    const state = uiReducer(uiReducer(initialUiState, { type: 'toggleToolbar' }), { type: 'toggleQualityPanel' });
    expect(state.isToolbarCollapsed).toBe(true);
    expect(state.isQualityPanelCollapsed).toBe(true);
  });

  it('begrenzt die Breite des Qualitätspanels', () => {
    expect(uiReducer(initialUiState, { type: 'setQualityPanelWidth', width: 10 }).qualityPanelWidth).toBe(QUALITY_PANEL_MIN_WIDTH);
    expect(uiReducer(initialUiState, { type: 'setQualityPanelWidth', width: 5000 }).qualityPanelWidth).toBe(QUALITY_PANEL_MAX_WIDTH);
    expect(uiReducer(initialUiState, { type: 'setQualityPanelWidth', width: 500 }).qualityPanelWidth).toBe(500);
  });

  it('wirft bei unbekannten Aktionen', () => {
    expect(() => uiReducer(initialUiState, { type: 'gibtsnicht' })).toThrow();
  });
});
