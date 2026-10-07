// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mockSides } from '../../../../lib/viewer-mock';
import { ArmorProfile } from '../ArmorProfile';

const { received } = mockSides();

const renderProfile = ({ isOpen = true, onToggle = vi.fn() } = {}) => {
  if (!received.profile) {
    throw new Error('no profile');
  }

  render(<ArmorProfile isOpen={isOpen} labels={received.labels} profile={received.profile} onToggle={onToggle} />);

  return onToggle;
};

describe(ArmorProfile, () => {
  it('names the weak zone with its advice', () => {
    renderProfile();

    expect(screen.getByText('Слабое место: ВЛД')).toBeDefined();
  });

  it('folds to its header', () => {
    const onToggle = renderProfile({ isOpen: false });

    fireEvent.click(screen.getByRole('button', { name: /Броня танка/ }));

    expect([screen.queryByText('Слабое место: ВЛД'), onToggle.mock.calls.length]).toStrictEqual([null, 1]);
  });
});
