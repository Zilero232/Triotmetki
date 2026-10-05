import { describe, expect, it } from 'vitest';

import { statusDock } from '../status-dock';

describe('statusDock', () => {
  it('asks to choose the game when no usable client is selected', () => {
    expect(statusDock({ hasUsableClient: false, isInstalled: false, view: null })).toEqual({ state: 'noGame', action: 'chooseGame' });
  });

  it('offers the install before any patch status', () => {
    expect(statusDock({ hasUsableClient: true, isInstalled: false, view: { kind: 'up_to_date', tone: 'success', action: null } })).toEqual({
      state: 'notInstalled',
      action: 'install'
    });
  });

  it('offers the update the patch status suggests', () => {
    expect(statusDock({ hasUsableClient: true, isInstalled: true, view: { kind: 'update_available', tone: 'premium', action: 'update' } })).toEqual({
      state: 'update_available',
      action: 'update'
    });
  });

  it('reports a pending migration even when the status itself is up to date', () => {
    expect(statusDock({ hasUsableClient: true, isInstalled: true, view: { kind: 'up_to_date', tone: 'success', action: 'migrate' } })).toEqual({
      state: 'migration_ready',
      action: 'migrate'
    });
  });

  it('offers nothing when the modpack is current', () => {
    expect(statusDock({ hasUsableClient: true, isInstalled: true, view: { kind: 'up_to_date', tone: 'success', action: null } })).toEqual({
      state: 'up_to_date',
      action: null
    });
  });
});
