import { highlight } from 'sugar-high';
import { describe, expect, it } from 'vitest';

import { codeLines } from '@/shared/lib/code-lines';

const SAMPLE = "const answer = 42;\n// <script>\nfetch('/v1/players')";

describe('codeLines', () => {
  it('keeps every character of the source, line by line', () => {
    const lines = codeLines(SAMPLE);

    expect(lines.map(({ tokens }) => tokens.map(({ value }) => value).join('')).join('\n')).toBe(SAMPLE);
  });

  it('marks only the first line as first', () => {
    expect(codeLines(SAMPLE).map(({ isFirst }) => isFirst)).toEqual([true, false, false]);
  });

  it('tokenises the same way the string highlighter does', () => {
    const container = document.createElement('code');

    container.innerHTML = highlight(SAMPLE);

    const expected = [...container.querySelectorAll('.sh__line')].map((line) =>
      [...line.children].map((token) => [token.className, token.textContent])
    );

    expect(codeLines(SAMPLE).map(({ tokens }) => tokens.map(({ className, value }) => [className, value]))).toEqual(expected);
  });
});
