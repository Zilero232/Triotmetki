import { beforeEach, describe, expect, it } from 'vitest';

import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { SECTION, SECTION_NAV } from '../../../config';
import {
  $editor,
  $editorFocus,
  $hits,
  $invalid,
  $query,
  $state,
  $summaries,
  $view,
  closeEditor,
  openEditor,
  openSection,
  openSetting,
  receiveState,
  setQuery
} from '../store';

const sample = stateSample;

const withRevision = (revision: number): string => JSON.stringify({ ...JSON.parse(sample), revision });

beforeEach(() => {
  $state.set(null);
  $invalid.set(false);
  $query.set('');
  $editor.set(null);
  $view.set({ section: SECTION_NAV.first });
});

describe(receiveState, () => {
  it('takes a pushed state', () => {
    const taken = receiveState(withRevision(5));

    expect(taken).toBe(true);
    expect($state.get()?.revision).toBe(5);
  });

  it('accepts an older push but keeps the newest revision', () => {
    receiveState(withRevision(5));

    const taken = receiveState(withRevision(3));

    expect(taken).toBe(true);
    expect($state.get()?.revision).toBe(5);
  });

  it('flags an invalid push and keeps the state it has', () => {
    receiveState(withRevision(5));

    const taken = receiveState('{');

    expect(taken).toBe(false);
    expect($invalid.get()).toBe(true);
    expect($state.get()?.revision).toBe(5);
  });

  it('rejects a missing push', () => {
    expect(receiveState(null)).toBe(false);
  });
});

describe('$summaries', () => {
  it('summarises the pages of the latest state', () => {
    receiveState(sample);

    expect($summaries.get()).toHaveLength(5);
  });
});

describe('$hits', () => {
  it('searches the cards of the latest state', () => {
    receiveState(sample);

    setQuery('minimap');

    expect($hits.get().map(({ component }) => component.id)).toEqual(['minimap']);
  });
});

describe(openSection, () => {
  it('opens a page with the search closed', () => {
    setQuery('zoom');

    openSection(SECTION.profiles);

    expect($query.get()).toBe('');
    expect($view.get()).toMatchObject({ section: SECTION.profiles });
  });
});

describe(openEditor, () => {
  it('opens the editor of a component', () => {
    openEditor('crosshair');

    expect($editor.get()).toBe('crosshair');
  });

  it('closes it', () => {
    openEditor('crosshair');

    closeEditor();

    expect($editor.get()).toBeNull();
  });

  it('closes it when another section opens', () => {
    openEditor('crosshair');

    openSection(SECTION.hud);

    expect($editor.get()).toBeNull();
  });
});

describe(openSetting, () => {
  it('opens the editor of a component on one of its settings', () => {
    openSetting({ componentId: 'minimap', key: 'size' });

    expect([$editor.get(), $editorFocus.get()]).toEqual(['minimap', 'size']);
  });

  it('forgets the setting when the editor closes', () => {
    openSetting({ componentId: 'minimap', key: 'size' });

    closeEditor();

    expect($editorFocus.get()).toBeNull();
  });

  it('forgets the setting when a plain editor opens', () => {
    openSetting({ componentId: 'minimap', key: 'size' });

    openEditor('crosshair');

    expect($editorFocus.get()).toBeNull();
  });
});
