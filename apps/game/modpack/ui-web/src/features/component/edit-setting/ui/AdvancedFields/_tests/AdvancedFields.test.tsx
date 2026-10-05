// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UiField } from '@/shared/api/protocol';

import { RU } from '@/shared/i18n/strings';

import { AdvancedFields } from '../AdvancedFields';

const FOLDER: UiField = {
  key: 'space',
  label: 'Hangar folder by hand',
  hint: null,
  type: 'text',
  value: '',
  default: '',
  max_length: 64,
  advanced: true
};

describe(AdvancedFields, () => {
  it('keeps the rare fields folded under «Дополнительно»', () => {
    render(<AdvancedFields fields={[FOLDER]} initiallyOpen={false} onSet={vi.fn()} />);

    expect(screen.getByRole('button', { name: new RegExp(RU.advancedFields) }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Hangar folder by hand')).toBeNull();
  });

  it('unfolds them on a click', () => {
    render(<AdvancedFields fields={[FOLDER]} initiallyOpen={false} onSet={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(RU.advancedFields) }));

    expect(screen.getByText('Hangar folder by hand')).toBeTruthy();
  });

  it('starts unfolded when the search found them', () => {
    render(<AdvancedFields initiallyOpen fields={[FOLDER]} onSet={vi.fn()} />);

    expect(screen.getByText('Hangar folder by hand')).toBeTruthy();
  });
});
