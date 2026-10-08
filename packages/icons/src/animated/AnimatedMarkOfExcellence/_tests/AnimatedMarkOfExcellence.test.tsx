import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkOfExcellenceIcon } from '../../../icons';
import { AnimatedMarkOfExcellence } from '../AnimatedMarkOfExcellence';

const serverMarkup = () => {
  const { container, unmount } = render(<MarkOfExcellenceIcon marks={3} />);
  const markup = container.innerHTML;

  unmount();

  return markup;
};

describe('AnimatedMarkOfExcellence', () => {
  it('hydrates over the static mark without a recoverable error', () => {
    const onRecoverableError = vi.fn();
    const container = document.createElement('div');

    container.innerHTML = serverMarkup();
    document.body.append(container);
    render(<AnimatedMarkOfExcellence marks={3} />, { container, hydrate: true, onRecoverableError });

    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it('hydrates over the static mark without a mismatch warning', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');

    container.innerHTML = serverMarkup();
    document.body.append(container);
    render(<AnimatedMarkOfExcellence marks={3} />, { container, hydrate: true });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('switches to the animated mark once hydrated', () => {
    const { container } = render(<AnimatedMarkOfExcellence marks={3} />);

    expect(container.querySelector('.otmetki-icon-mark-3-animated')).not.toBeNull();
  });
});
