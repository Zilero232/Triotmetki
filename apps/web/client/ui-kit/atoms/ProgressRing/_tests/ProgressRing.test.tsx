import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { ProgressRing } from '../ProgressRing';

const LOCALE = 'ru';

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale={LOCALE} messages={{}} timeZone='UTC'>
    {children}
  </NextIntlClientProvider>
);

describe('ProgressRing', () => {
  it('is an accessible progress bar named by its label', () => {
    render(<ProgressRing label='Прогресс отметки' max={100} value={42} />, { wrapper });

    const ring = screen.getByRole('progressbar', { name: 'Прогресс отметки' });

    expect(ring).toHaveAttribute('aria-valuenow', '42');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('formats its value text in the app locale rather than the runtime default', () => {
    render(<ProgressRing label='Отметка' max={200} value={50} />, { wrapper });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', new Intl.NumberFormat(LOCALE, { style: 'percent' }).format(50 / 200));
  });

  it('renders its content in the middle and sizes itself', () => {
    render(
      <ProgressRing label='Мастер' size={72} value={42}>
        42
      </ProgressRing>,
      { wrapper }
    );

    const ring = screen.getByRole('progressbar');

    expect(ring).toHaveTextContent('42');
    expect(ring).toHaveStyle({ width: '72px', height: '72px' });
  });

  it('draws a full ring for an overfull value', () => {
    const { container } = render(<ProgressRing max={100} value={140} />, { wrapper });

    expect(container.querySelector('[stroke-dasharray]')).toHaveAttribute('stroke-dasharray', '1 1');
  });

  it('draws an empty ring for a zero max', () => {
    const { container } = render(<ProgressRing max={0} value={10} />, { wrapper });

    expect(container.querySelector('[stroke-dasharray]')).toHaveAttribute('stroke-dasharray', '0 1');
  });

  it('reports an out-of-range value clamped to the range', () => {
    const { rerender } = render(<ProgressRing label='Отметка' max={100} value={140} />, { wrapper });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    rerender(<ProgressRing label='Отметка' max={100} value={-5} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('never hides or replays a ring that mounts in the first viewport', () => {
    render(<ProgressRing label='Отметка' value={42} />, { wrapper });

    expect(screen.getByRole('progressbar')).not.toHaveAttribute('data-reveal');
  });

  it('holds a ring that mounts below the fold empty until it scrolls into view', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, window.innerHeight + 200, 48, 48));

    render(<ProgressRing label='Отметка' value={42} />, { wrapper });

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-reveal', 'hidden');
  });
});
