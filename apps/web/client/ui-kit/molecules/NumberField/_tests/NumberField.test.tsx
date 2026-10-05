import type { ReactElement } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';
import { FormControlContext } from '@/shared/lib';

import { NumberField } from '../NumberField';

const LIMITS = { min: 0, max: 10, step: 5 };
const STEPPERS = messages.en.common.numberField;

const renderWithIntl = (ui: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {ui}
    </NextIntlClientProvider>
  );

describe('NumberField', () => {
  it('ties the label to the input', () => {
    renderWithIntl(<NumberField label='Battles' value={3} onValueChange={vi.fn()} />);

    expect(screen.getByLabelText('Battles')).toHaveValue('3');
  });

  it('steps up by the given step', () => {
    const onValueChange = vi.fn<(value: number | null) => void>();

    renderWithIntl(<NumberField label='Battles' {...LIMITS} value={LIMITS.min} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: STEPPERS.increment }));

    expect(onValueChange).toHaveBeenLastCalledWith(LIMITS.min + LIMITS.step, expect.anything());
  });

  it('steps by one when no step is given', () => {
    const onValueChange = vi.fn<(value: number | null) => void>();

    renderWithIntl(<NumberField label='Battles' value={4} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: STEPPERS.decrement }));

    expect(onValueChange).toHaveBeenLastCalledWith(3, expect.anything());
  });

  it('clamps a step past the maximum to the maximum', () => {
    const onValueChange = vi.fn<(value: number | null) => void>();

    renderWithIntl(<NumberField label='Battles' {...LIMITS} value={LIMITS.max - 1} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: STEPPERS.increment }));

    expect(onValueChange).toHaveBeenLastCalledWith(LIMITS.max, expect.anything());
  });

  it('does not step below the minimum', () => {
    const onValueChange = vi.fn<(value: number | null) => void>();

    renderWithIntl(<NumberField label='Battles' {...LIMITS} value={LIMITS.min} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: STEPPERS.decrement }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('marks the input invalid when its form field has an error', () => {
    renderWithIntl(
      <FormControlContext value={{ 'aria-invalid': true }}>
        <NumberField aria-label='Battles' value={3} onValueChange={vi.fn()} />
      </FormControlContext>
    );

    expect(screen.getByLabelText('Battles')).toHaveAttribute('aria-invalid', 'true');
  });
});
