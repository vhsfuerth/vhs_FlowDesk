import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmProvider from '../components/ConfirmDialog';

/** Rendert `ui` innerhalb des ConfirmProviders und liefert zusätzlich eine userEvent-Instanz. */
export function renderWithConfirm(ui) {
  const user = userEvent.setup();
  return { user, ...render(<ConfirmProvider>{ui}</ConfirmProvider>) };
}
