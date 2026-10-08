import { ArmorMap } from '@/entities/armor/armor-map';

import { useArmorScreen } from '../model/hooks/use-armor-screen';
import { CameraBar, DuelPanel, HoverCard, LegendPanel, ModeTabs, TankPicker, ViewerHeader } from './components';

import s from './ArmorViewer.module.scss';

export const ArmorViewer = () => {
  const { viewer, surfaceRef, layerRef, layer, frame, card } = useArmorScreen();
  const { state, hover } = viewer;

  return (
    <div className={s.viewer}>
      <div ref={surfaceRef} className={s.surface} />
      <div ref={layerRef} className={s.layer} style={layer}>
        <ArmorMap data={viewer.map} onDrawn={viewer.reportDraw} />
      </div>
      {state && (
        <div className={s.frame} style={frame}>
          <div className={s.header}>
            <ViewerHeader labels={state.labels} tank={state.tank} onClose={viewer.close} />
          </div>
          <div className={s.tabs}>
            <ModeTabs label={state.labels.title ?? ''} modes={state.modes} onSelect={viewer.pickMode} />
          </div>
          <div className={s.left}>
            <TankPicker state={state} onModules={viewer.pickModules} onPick={viewer.pickTank} onSearch={viewer.search} />
          </div>
          <div className={s.right}>
            <DuelPanel state={state} onAttacker={viewer.pickAttacker} onDistance={viewer.pickDistance} onShell={viewer.pickShell} />
            <LegendPanel label={state.labels.legend ?? ''} legend={state.legend} status={viewer.status} />
          </div>
          <div className={s.bottom}>
            <CameraBar cameras={state.cameras} labels={state.labels} onCamera={viewer.flyTo} onSite={viewer.openSite} />
          </div>
        </div>
      )}
      {card && hover && <HoverCard place={card} readout={hover} />}
    </div>
  );
};
