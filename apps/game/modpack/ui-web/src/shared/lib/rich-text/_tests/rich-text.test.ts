import { describe, expect, it } from 'vitest';

import { parseRichText } from '../rich-text';

const REPEATED_MARKUP = 'x<img src="img://a.png"/>x\nx<br/>x<br>x';

describe(parseRichText, () => {
  it('splits lines and keeps nested font styles', () => {
    const lines = parseRichText('<font color="#f2ead3" size="16">MoE <b>86.12%</b></font>\nplain');

    expect(lines).toMatchObject([
      {
        runs: [
          { kind: 'text', text: 'MoE ', style: { color: '#F2EAD3', size: 16 } },
          { kind: 'text', text: '86.12%', style: { color: '#F2EAD3', size: 16, bold: true } }
        ]
      },
      { runs: [{ kind: 'text', text: 'plain', style: {} }] }
    ]);
  });

  it('closes only the matching tag and ignores unknown ones', () => {
    const lines = parseRichText("<font color='#7CD35B'><p>a</font></b>b<br/>c</i>");

    expect(lines).toMatchObject([
      {
        runs: [
          { kind: 'text', text: 'a', style: { color: '#7CD35B' } },
          { kind: 'text', text: 'b', style: {} }
        ]
      },
      { runs: [{ kind: 'text', text: 'c', style: {} }] }
    ]);
  });

  it('decodes entities and never turns them into markup', () => {
    const lines = parseRichText('&lt;script&gt; &amp; &#8594; &#x2713;&nbsp;&bogus;');

    expect(lines).toMatchObject([{ runs: [{ kind: 'text', text: '<script> & → ✓ &bogus;', style: {} }] }]);
  });

  it('replaces a code point outside Unicode or a surrogate instead of throwing', () => {
    const lines = parseRichText('a&#x110000;b&#xD800;c&#99999999999999999999;d&#xDFFF;e&#x10FFFF;');

    expect(lines).toMatchObject([{ runs: [{ kind: 'text', text: 'a�b�c�d�e\u{10FFFF}', style: {} }] }]);
  });

  it('keeps the nul code point and the last code point before the surrogates', () => {
    const lines = parseRichText('&#0;&#xD7FF;&#xE000;');

    expect(lines).toMatchObject([{ runs: [{ kind: 'text', text: '\u0000퟿', style: {} }] }]);
  });

  it('keeps a game image with its valid attributes and drops the rest', () => {
    const lines = parseRichText('<img src="img://gui/maps/lamp.png" width="32" height="x"/><img src="https://evil"/>');

    expect(lines).toMatchObject([{ runs: [{ kind: 'image', src: 'img://gui/maps/lamp.png', width: 32, height: undefined }] }]);
  });

  it('drops an invalid font colour and size', () => {
    const lines = parseRichText('<font color="red" size="-3">x</font>');

    expect(lines).toMatchObject([{ runs: [{ kind: 'text', text: 'x', style: {} }] }]);
  });

  it('keys every line by its place in the markup, so repeated text never shares a key', () => {
    const lines = parseRichText(REPEATED_MARKUP);

    const lineKeys = new Set(lines.map(({ key }) => key));

    expect(lineKeys.size).toBe(lines.length);
  });

  it('keys every run by its place in its line, so repeated text never shares a key', () => {
    const lines = parseRichText(REPEATED_MARKUP);

    const clashes = lines.filter(({ runs }) => new Set(runs.map(({ key }) => key)).size !== runs.length);

    expect(clashes).toEqual([]);
  });

  it('keys the same markup the same way every time', () => {
    const first = parseRichText(REPEATED_MARKUP);

    const second = parseRichText(REPEATED_MARKUP);

    expect(second).toEqual(first);
  });

  it('returns one empty line for empty text', () => {
    expect(parseRichText('')).toMatchObject([{ runs: [] }]);
  });
});
