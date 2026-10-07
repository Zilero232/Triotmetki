import { HIT_VIEWER } from '../config';
import { useArmorProfile } from '../model/hooks/use-armor-profile';
import { useCameraDrag } from '../model/hooks/use-camera-drag';
import { useHitFilter } from '../model/hooks/use-hit-filter';
import { useHitViewer } from '../model/hooks/use-hit-viewer';
import { useViewerFrame } from '../model/hooks/use-viewer-frame';
import { useViewerKeys } from '../model/hooks/use-viewer-keys';
import { ArmorProfile } from './components/ArmorProfile';
import { HitColumn } from './components/HitColumn';
import { ViewerBar } from './components/ViewerBar';
import { ViewerEmpty } from './components/ViewerEmpty';

import s from './HitViewer.module.scss';

export const HitViewer = () => {
  const viewer = useHitViewer();
  const surfaceRef = useCameraDrag(viewer.move);
  const frame = useViewerFrame();
  const filter = useHitFilter({ state: viewer.state, onPick: viewer.pickHit });
  const armor = useArmorProfile();

  useViewerKeys({ onStep: filter.step, onSwitchTab: viewer.switchTab });

  const { state, selectedRow, sideLabels } = viewer;

  if (!state) {
    return null;
  }

  const { labels, battle } = state;
  const profile = state.tab === HIT_VIEWER.profileSide ? state.profile : null;

  return (
    <div className={s.viewer}>
      <div ref={surfaceRef} className={s.surface} />
      <div className={s.frame} style={frame}>
        {battle && profile && (
          <div className={s.side}>
            <ArmorProfile isOpen={armor.isOpen} labels={labels} profile={profile} onToggle={armor.toggle} />
          </div>
        )}
        <ViewerBar sideLabels={sideLabels} state={state} onBattle={viewer.pickBattle} onClose={viewer.close} onTab={viewer.pickTab} />
        {battle ? (
          <>
            <HitColumn filter={filter} selectedRow={selectedRow} state={state} onPick={viewer.pickHit} />
            <div className={s.footer}>
              <span className={s.hint}>{viewer.footer}</span>
            </div>
          </>
        ) : (
          <ViewerEmpty labels={labels} onClose={viewer.close} />
        )}
      </div>
    </div>
  );
};
