import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareModal } from './ShareModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./ShareCard', () => ({
  ShareCard: React.forwardRef<HTMLDivElement>((_props, ref) => (
    <div ref={ref} data-testid="share-card" style={{ width: 400, minHeight: 900 }}>
      share-card
    </div>
  )),
}));

describe('ShareModal', () => {
  it('uses a dedicated scrollable preview area so tall cards stay fully reachable', () => {
    render(<ShareModal open={true} onClose={() => {}} />);

    const preview = screen.getByTestId('share-modal-preview');
    expect(preview).toHaveStyle({ overflow: 'auto' });
    expect(preview).toHaveStyle({ flex: '1 1 auto' });
    expect(preview).toHaveStyle({ minHeight: '0' });
  });
});
