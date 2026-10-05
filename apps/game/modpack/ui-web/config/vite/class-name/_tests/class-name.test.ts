import { describe, expect, it } from 'vitest';

import { scopedClassName } from '../class-name';

const WINDOWS_PATH = String.raw`C:\work\ui-web\src\ui-kit\atoms\Toggle\Toggle.module.scss`;
const POSIX_PATH_WITH_QUERY = '/home/ci/ui-web/src/ui-kit/atoms/Toggle/Toggle.module.scss?used';

describe('scopedClassName', () => {
  it('names a module class after its component on a Windows path', () => {
    expect(scopedClassName('root', WINDOWS_PATH)).toBe('otmetki-Toggle__root');
  });

  it('names a module class after its component on a POSIX path with a query', () => {
    expect(scopedClassName('knobOn', POSIX_PATH_WITH_QUERY)).toBe('otmetki-Toggle__knobOn');
  });
});
