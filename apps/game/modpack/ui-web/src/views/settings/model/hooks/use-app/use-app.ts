import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import type { StringKey } from '@/shared/i18n';

import { $editor, $invalid, $query, $state, $view, receiveFeed, receiveState, WINDOW_VIEW } from '@/entities/window/window-state';
import { gameface } from '@/shared/api/gameface';
import { send } from '@/shared/api/protocol';
import { engineReport } from '@/shared/lib/engine-shims/install';
import { onDistinct } from '@/shared/lib/on-distinct';
import { reportOnce } from '@/shared/lib/page-diag';
import { bindUiSounds } from '@/shared/lib/ui-sounds';
import { blockPageWheel } from '@/shared/lib/wheel-scroll';
import { useWindowFrame } from '@/widgets/window/window-frame';

import { watchEscape } from '../../../lib/escape-answer';

export const useApp = () => {
  const state = useStore($state);
  const view = useStore($view);
  const query = useStore($query);
  const invalid = useStore($invalid);
  const editorId = useStore($editor);
  const frame = useWindowFrame(state?.window ?? null);

  useEffect(() => blockPageWheel(document), []);

  useEffect(() => bindUiSounds(document), []);

  useEffect(() => {
    gameface.fitView();

    const takeState = onDistinct(receiveState);
    const takeFeed = onDistinct(receiveFeed);
    const takeEscape = watchEscape();

    gameface.onDataChanged(() => {
      takeState(gameface.state());
      takeFeed(gameface.feed());
      takeEscape(gameface.escape());
    });

    send({ type: 'ready' });
    reportOnce({ kind: 'engine', text: engineReport() });
  }, []);

  const editing = state?.components.find(({ id, editor }) => id === editorId && editor) ?? null;
  const placeholderKey: StringKey = invalid ? 'invalidState' : 'loading';

  return {
    state,
    section: view.section,
    searching: query.trim().length >= WINDOW_VIEW.searchMinLength,
    editing,
    frame,
    compact: frame.layout.compactNav,
    columns: frame.layout.columns,
    placeholderKey
  };
};
