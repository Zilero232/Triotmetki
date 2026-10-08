import { describe, expect, it } from 'vitest';

import { drawReportText, parseArmorHover, parseArmorMap, parseArmorState, parseArmorStatus } from '..';
import hover from './fixtures/armor-hover.sample.json';
import map from './fixtures/armor-map.sample.json';
import state from './fixtures/armor-state.sample.json';
import status from './fixtures/armor-status.sample.json';

describe(parseArmorState, () => {
  it('reads the state the Python screen writes', () => {
    expect(parseArmorState(JSON.stringify(state))?.tank?.cd).toBe(state.tank.cd);
  });

  it('keeps every camera preset', () => {
    expect(parseArmorState(JSON.stringify(state))?.cameras).toHaveLength(state.cameras.length);
  });

  it('refuses a state without labels', () => {
    expect(parseArmorState(JSON.stringify({ ...state, labels: null }))).toBeNull();
  });

  it('refuses junk', () => {
    expect(parseArmorState('{')).toBeNull();
  });
});

describe(parseArmorMap, () => {
  it('reads the cells the Python screen writes', () => {
    expect(parseArmorMap(JSON.stringify(map))?.cells).toBe(map.cells);
  });

  it('reads a cleared map as no map', () => {
    expect(parseArmorMap('null')).toBeNull();
  });
});

describe(parseArmorHover, () => {
  it('reads the card the Python screen writes', () => {
    expect(parseArmorHover(JSON.stringify(hover))?.rows).toHaveLength(hover.rows.length);
  });

  it('reads no card before the first push', () => {
    expect(parseArmorHover('')).toBeNull();
  });
});

describe(parseArmorStatus, () => {
  it('reads the build progress', () => {
    expect(parseArmorStatus(JSON.stringify(status))?.progress).toBe(status.progress);
  });
});

describe(drawReportText, () => {
  it('writes the spike line python.log keeps', () => {
    expect(drawReportText({ width: 2560, height: 1440, cells: 5321, ms: 12 })).toBe('canvas 2560x1440, 5321 cells drawn in 12 ms');
  });
});
