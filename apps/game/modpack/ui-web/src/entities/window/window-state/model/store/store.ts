import { atom, computed, map } from 'nanostores';

import type { UiState } from '@/shared/api/protocol';

import { parseState } from '@/shared/api/protocol';

import type { OpenSettingInput, Section, UndoEntry, View } from './store.types';

import { SECTION_NAV } from '../../config';
import { searchComponents, summarize } from '../../lib/components';
import { fontSafeState } from '../../lib/font-safe-state';
import { seedScroll } from '../scroll';

export const $state = atom<UiState | null>(null);
export const $invalid = atom(false);
export const $view = map<View>({ section: SECTION_NAV.first });
export const $query = atom('');
export const $undo = atom<UndoEntry[]>([]);
export const $focusSeq = atom(0);
export const $editor = atom<string | null>(null);
export const $editorFocus = atom<string | null>(null);

export const $components = computed($state, (state) => state?.components ?? []);
export const $summaries = computed($components, summarize);
export const $hits = computed([$components, $query], (components, query) => searchComponents({ components, query }));

export const openSection = (section: Section): void => {
  $query.set('');
  $editor.set(null);
  $editorFocus.set(null);
  $view.set({ ...$view.get(), section });
};

export const receiveState = (raw: string | null): boolean => {
  if (raw === null || raw === '') {
    return false;
  }

  const parsed = parseState(raw);

  $invalid.set(parsed === null);

  if (parsed === null) {
    return false;
  }

  const state = fontSafeState(parsed);

  const previous = $state.get();

  if (!previous) {
    seedScroll(state.scroll);
  }

  if (!previous || state.revision >= previous.revision) {
    $state.set(state);
  }

  if (state.focus && state.focus.seq !== $focusSeq.get()) {
    $focusSeq.set(state.focus.seq);
    openSection(state.focus.section);
  }

  return true;
};

export const openEditor = (componentId: string): void => {
  $editorFocus.set(null);
  $editor.set(componentId);
};

export const openSetting = ({ componentId, key }: OpenSettingInput): void => {
  $editorFocus.set(key);
  $editor.set(componentId);
};

export const closeEditor = (): void => {
  $editor.set(null);
  $editorFocus.set(null);
};

export const setQuery = (query: string): void => {
  $query.set(query);
};
