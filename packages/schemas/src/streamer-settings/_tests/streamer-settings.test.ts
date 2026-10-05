import { describe, expect, it } from 'vitest';

import { changedGroups, diffSettings, flattenSettings, toSettingsValues, valuesForApply, zoomMax } from '../streamer-settings';
import { STREAMER_SETTINGS, STREAMER_SETTINGS_APPLICABLE } from '../streamer-settings.constants';
import {
  controlsValuesSchema,
  createApplyRequestSchema,
  markersValuesSchema,
  modDeviceRequestSchema,
  settingsCompareQuerySchema,
  streamerSettingsSchema
} from '../streamer-settings.schemas';

const provenance = { source: 'creator', sourceUrl: null, checkedAt: '2026-09-26T10:00:00.000Z' } as const;

describe('streamerSettingsSchema', () => {
  it('requires provenance on every group', () => {
    expect(streamerSettingsSchema.safeParse({ camera: { fov: 95 } }).success).toBe(false);
    expect(streamerSettingsSchema.safeParse({ camera: { fov: 95, ...provenance } }).success).toBe(true);
  });

  it('rejects a malformed resolution', () => {
    expect(streamerSettingsSchema.safeParse({ display: { resolution: '1920*1080', ...provenance } }).success).toBe(false);
  });
});

describe('flattenSettings', () => {
  it('flattens nested values and drops provenance', () => {
    const flat = flattenSettings({ controls: { sensitivity: { sniper: 0.35 }, ...provenance }, zoom: { steps: ['x2', 'x8'], ...provenance } });

    expect(flat).toEqual({ 'controls.sensitivity.sniper': 0.35, 'zoom.steps': 'x2, x8' });
  });
});

describe('diffSettings', () => {
  it('marks differing and missing values', () => {
    const rows = diffSettings([{ camera: { fov: 95, postMortem: false } }, { camera: { fov: 95, postMortem: true } }, { camera: { fov: 95 } }]);

    expect(rows).toEqual([
      { field: 'camera.fov', values: [95, 95, 95], differs: false },
      { field: 'camera.postMortem', values: [false, true, null], differs: true }
    ]);
  });

  it('orders fields by group', () => {
    const rows = diffSettings([{ zoom: { steps: ['x2'] }, display: { preset: 'low' } }]);

    expect(rows.map((row) => row.field)).toEqual(['display.preset', 'zoom.steps']);
  });
});

describe('zoomMax', () => {
  it('returns the largest enabled step', () => {
    expect(zoomMax(['x8', 'x2', 'x16'])).toBe('x16');
    expect(zoomMax(undefined)).toBeNull();
  });
});

describe('valuesForApply', () => {
  const values = {
    display: { resolution: '1920x1080', refreshRate: 144, preset: 'medium' as const },
    controls: { sensitivity: { sniper: 0.3 }, invert: false },
    zoom: { steps: ['x2' as const] }
  };

  it('leaves resolution and sensitivity out by default', () => {
    expect(valuesForApply({ values, groups: ['display', 'controls'], includeResolution: false, includeSensitivity: false })).toEqual({
      display: { preset: 'medium' },
      controls: { invert: false }
    });
  });

  it('includes them on opt-in', () => {
    const picked = valuesForApply({ values, groups: ['display', 'controls'], includeResolution: true, includeSensitivity: true });

    expect(picked.display?.resolution).toBe('1920x1080');
    expect(picked.controls?.sensitivity?.sniper).toBe(0.3);
  });
});

describe('changedGroups', () => {
  it('lists groups whose values changed', () => {
    expect(changedGroups({ previous: { camera: { fov: 90 } }, next: { camera: { fov: 95 }, zoom: { steps: ['x2'] } } })).toEqual(['camera', 'zoom']);
    expect(changedGroups({ previous: null, next: {} })).toEqual([]);
  });
});

describe('toSettingsValues', () => {
  it('strips provenance', () => {
    expect(toSettingsValues({ camera: { fov: 95, ...provenance } })).toEqual({ camera: { fov: 95 } });
  });
});

describe('settingsCompareQuerySchema', () => {
  it('dedupes slugs and caps the count', () => {
    expect(settingsCompareQuerySchema.parse({ slugs: 'jove, near-you,jove' }).slugs).toEqual(['jove', 'near-you']);
    expect(settingsCompareQuerySchema.safeParse({ slugs: 'a,b,c,d,e' }).success).toBe(false);
  });
});

describe('modDeviceRequestSchema', () => {
  it('accepts the device ids the server issues', () => {
    expect(modDeviceRequestSchema.safeParse({ device_id: 'dev_Ab3-xZ_09', account_id: 7 }).success).toBe(true);
  });

  it('refuses ids with characters outside the device alphabet', () => {
    expect(modDeviceRequestSchema.safeParse({ device_id: 'dev/../x', account_id: 7 }).success).toBe(false);
  });
});

describe('settings input bounds', () => {
  it('collapses repeated apply groups and refuses more groups than exist', () => {
    expect(createApplyRequestSchema.parse({ slug: 'a', groups: ['zoom', 'zoom'] }).groups).toEqual(['zoom']);

    const tooMany = Array.from({ length: STREAMER_SETTINGS_APPLICABLE.length + 1 }).fill('zoom');

    expect(createApplyRequestSchema.safeParse({ slug: 'a', groups: tooMany }).success).toBe(false);
  });

  it('caps the notable binds and the marker fields', () => {
    const binds = Object.fromEntries(Array.from({ length: STREAMER_SETTINGS.maxNotableBinds + 1 }, (_, index) => [`k${index}`, 'v']));
    const markers = Array.from({ length: STREAMER_SETTINGS.markerFields.length + 1 }).fill('icon');

    expect(controlsValuesSchema.safeParse({ notableBinds: binds }).success).toBe(false);
    expect(markersValuesSchema.safeParse({ enemy: { base: markers } }).success).toBe(false);
  });
});
