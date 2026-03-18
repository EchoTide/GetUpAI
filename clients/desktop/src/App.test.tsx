import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pages/DashboardPage', () => ({
  default: () => <div data-testid="dashboard-page">dashboard</div>,
}));

vi.mock('./pages/PopupPage', () => ({
  default: () => <div data-testid="popup-page">popup</div>,
}));

vi.mock('./components/UpdateNotification', () => ({
  UpdateNotification: () => <div data-testid="update-notification">update</div>,
}));

describe('App local-only mode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('opens the dashboard without requiring login', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });
});
