import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClanEmblem } from '../ClanEmblem';

const SRC = 'https://api.tanki.su/static/clans/emblems/KOPM_64.png';

describe('ClanEmblem', () => {
  it('shows the API emblem at its native size', () => {
    render(<ClanEmblem isDecorative={false} size='md' src={SRC} tag='KOPM' />);

    const image = screen.getByRole('img', { name: 'KOPM' });

    expect(image.getAttribute('src')).toBe(SRC);
    expect(image.getAttribute('width')).toBe('64');
  });

  it('renders the header size without scaling', () => {
    render(<ClanEmblem isDecorative={false} size='lg' src={SRC} tag='KOPM' />);

    expect(screen.getByRole('img', { name: 'KOPM' }).getAttribute('width')).toBe('96');
  });

  it('falls back to the tag letters without an emblem or when it fails', () => {
    const { container, rerender } = render(<ClanEmblem isDecorative={false} src={null} tag='KOPM' />);

    expect(screen.getByRole('img', { name: 'KOPM' }).textContent).toBe('KO');

    rerender(<ClanEmblem isDecorative={false} src={SRC} tag='KOPM' />);
    fireEvent.error(screen.getByRole('img', { name: 'KOPM' }));

    expect(container.firstElementChild?.getAttribute('data-state')).toBe('fallback');
  });

  it('stays out of the accessibility tree by default, since the clan tag is always written next to it', () => {
    const { container } = render(<ClanEmblem src={SRC} tag='KOPM' />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
