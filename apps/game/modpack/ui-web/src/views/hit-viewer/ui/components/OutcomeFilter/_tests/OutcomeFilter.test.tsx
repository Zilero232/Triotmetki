// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { toneCounts } from '../../../../lib/hit-filter';
import { mockSides } from '../../../../lib/viewer-mock';
import { OutcomeFilter } from '../OutcomeFilter';

const { received } = mockSides();

const renderFilter = (tone: 'pen' | null = null) => {
  const onPick = vi.fn();

  render(
    <OutcomeFilter
      counts={toneCounts(received.rows)}
      labels={received.labels}
      summary={received.summary ?? null}
      tone={tone}
      total={received.rows.length}
      onPick={onPick}
    />
  );

  return onPick;
};

describe(OutcomeFilter, () => {
  it('picks a result to show only its hits', () => {
    const onPick = renderFilter();

    fireEvent.click(screen.getByRole('button', { name: /Пробитие/ }));

    expect(onPick).toHaveBeenCalledWith('pen');
  });

  it('drops the pick on a second click', () => {
    const onPick = renderFilter('pen');

    fireEvent.click(screen.getByRole('button', { name: /Пробитие/ }));

    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('shows the share the armour held', () => {
    renderFilter();

    expect(screen.getByText('Броня держит')).toBeDefined();
  });
});
