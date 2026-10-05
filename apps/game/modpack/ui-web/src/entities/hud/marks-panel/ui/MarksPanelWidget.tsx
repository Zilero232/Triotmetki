import { HudPlate, HudText } from '@/ui-kit';

import type { MarksPanelWidgetProps } from './MarksPanelWidget.types';

import { marksPanelView } from '../lib/marks-panel-view';
import { MarksAverage, MarksBox, MarksDamage, MarksMain, MarksSilhouette, MarksThresholds } from './components';

import s from './MarksPanelWidget.module.scss';

export const MarksPanelWidget = ({ data }: MarksPanelWidgetProps) => {
  const view = marksPanelView(data);

  if (view.text !== null) {
    return (
      <HudPlate className={s.plate}>
        <HudText className={s.custom} text={view.text} />
      </HudPlate>
    );
  }

  return (
    <HudPlate className={view.look === 'silhouette' ? s.large : s.plate}>
      {view.look === 'line' && <MarksMain view={view} />}
      {view.look === 'box' && <MarksBox view={view} />}
      {view.look === 'silhouette' && <MarksSilhouette view={view} />}
      <MarksDamage damage={view.damage} />
      <MarksThresholds step={view.step} thresholds={view.thresholds} />
      <MarksAverage average={view.average} battles={view.battles} />
    </HudPlate>
  );
};
