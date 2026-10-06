import { ErrorBoundary } from 'react-error-boundary';

import { useHudOverlay } from '../model/hooks';
import { HudHint, HudLabel } from './components';

import s from './HudOverlay.module.scss';

export const HudOverlay = () => {
  const overlay = useHudOverlay();

  return (
    <div className={s.overlay} style={overlay.style}>
      {overlay.labels.map((label) => (
        <ErrorBoundary key={label.id} fallback={null} resetKeys={[label.panel]}>
          <HudLabel {...label} />
        </ErrorBoundary>
      ))}
      {overlay.hint && (
        <ErrorBoundary fallback={null} resetKeys={[overlay.hint]}>
          <HudHint hint={overlay.hint} screen={overlay.screen} />
        </ErrorBoundary>
      )}
    </div>
  );
};
