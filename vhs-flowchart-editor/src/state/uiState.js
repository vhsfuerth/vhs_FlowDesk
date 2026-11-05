// UI-Zustand der App (Dialoge, Seitenleisten) als Reducer.
// Es ist immer höchstens ein Hauptdialog geöffnet.

export const MODALS = {
  SETTINGS: 'settings',
  DIAGRAM_LIST: 'diagramList',
  TEMPLATES: 'templates',
  GUIDE: 'guide',
  VERSIONS: 'versions',
  COPILOT: 'copilot',
  SUBPROCESS: 'subprocess'
};

export const QUALITY_PANEL_MIN_WIDTH = 380;
export const QUALITY_PANEL_MAX_WIDTH = 760;

export const initialUiState = {
  openModal: null,
  isToolbarCollapsed: false,
  isQualityPanelCollapsed: false,
  qualityPanelWidth: 460
};

export function uiReducer(state, action) {
  switch (action.type) {
    case 'openModal':
      return { ...state, openModal: action.modal };
    case 'closeModal':
      return { ...state, openModal: null };
    case 'toggleToolbar':
      return { ...state, isToolbarCollapsed: !state.isToolbarCollapsed };
    case 'toggleQualityPanel':
      return { ...state, isQualityPanelCollapsed: !state.isQualityPanelCollapsed };
    case 'setQualityPanelWidth':
      return {
        ...state,
        qualityPanelWidth: Math.max(QUALITY_PANEL_MIN_WIDTH, Math.min(QUALITY_PANEL_MAX_WIDTH, action.width))
      };
    default:
      throw new Error(`Unbekannte UI-Aktion: ${action.type}`);
  }
}
