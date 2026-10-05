// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldOf } from '@/shared/api/protocol';

import { ChoiceGallery } from '../ChoiceGallery';

const FIELD: FieldOf<'choice'> = {
  key: 'icon_set',
  label: 'Icon',
  hint: null,
  type: 'choice',
  value: 'lamp',
  default: 'lamp',
  choices: [
    { value: 'lamp', label: 'Lamp' },
    { value: 'eye', label: 'Eye' },
    { value: 'custom', label: 'Own picture' }
  ]
};

const ICONS = {
  lamp: 'img://gui/maps/icons/otmetki/sixth_sense/lamp_64.png',
  eye: 'img://gui/maps/icons/otmetki/sixth_sense/eye_64.png',
  custom: null
};

describe(ChoiceGallery, () => {
  it('draws every option as a thumbnail with its name', () => {
    const { container } = render(<ChoiceGallery field={FIELD} icons={ICONS} onSelect={vi.fn()} />);

    expect([...container.querySelectorAll('img')].map((image) => image.getAttribute('src'))).toEqual([ICONS.lamp, ICONS.eye]);
    expect(screen.getByText('Own picture')).toBeTruthy();
  });

  it('marks the chosen option as pressed', () => {
    render(<ChoiceGallery field={FIELD} icons={ICONS} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Lamp' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Eye' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('picks the option that is clicked', () => {
    const onSelect = vi.fn();

    render(<ChoiceGallery field={FIELD} icons={ICONS} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eye' }));

    expect(onSelect).toHaveBeenCalledWith('eye');
  });
});
