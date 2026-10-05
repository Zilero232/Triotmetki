// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardSummary } from '../CardSummary';

describe(CardSummary, () => {
  it('shows the chosen keys as key chips', () => {
    render(
      <CardSummary
        summary={{
          keys: [
            { key: 'zoom_key', label: 'Zoom key', value: 'Ctrl+Shift+K' },
            { key: 'server_aim_key', label: 'Server reticle key', value: null }
          ],
          checked: []
        }}
        kind='keys'
      />
    );

    expect(screen.getByText('Ctrl+Shift+K')).toBeTruthy();
    expect(screen.getByText('Server reticle key')).toBeTruthy();
  });

  it('lists what is checked', () => {
    render(<CardSummary kind='checklist' summary={{ keys: [], checked: ['Sell shells', 'Sell modules'] }} />);

    expect(screen.getByText('Sell shells')).toBeTruthy();
    expect(screen.getByText('Sell modules')).toBeTruthy();
  });
});
