import { HudPlate, HudText } from '@/ui-kit';

import type { MarksPanelWidgetProps } from './MarksPanelWidget.types';

import { marksPanelView } from '../lib/marks-panel-view';
import { MarksAverage, MarksBox, MarksMain, MarksThresholds } from './components';

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
    <HudPlate className={s.plate}>
      {view.look === 'line' ? <MarksMain view={view} /> : <MarksBox view={view} />}
      <MarksThresholds step={view.step} thresholds={view.thresholds} />
      <MarksAverage average={view.average} />
    </HudPlate>
  );
};
