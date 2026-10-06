import { SECTION, SECTION_ICONS, SECTION_TEXT, useT } from '@/entities/window/window-state';
import { PageHeader } from '@/ui-kit';
import { SectionStrip } from '@/widgets/component/component-list';
import { ReplaysBrowser } from '@/widgets/replay/replays-browser';

import { useReplaysPage } from '../../../model/hooks';

import s from './ReplaysPage.module.scss';

export const ReplaysPage = () => {
  const t = useT();
  const replays = useReplaysPage();

  return (
    <div className={s.page}>
      <PageHeader aside={<SectionStrip section={SECTION.replays} />} icon={SECTION_ICONS.replays} title={t(SECTION_TEXT.replays.title)} />
      {replays && <ReplaysBrowser enabled={replays.enabled} page={replays.page} onTurnOn={replays.turnOn} />}
    </div>
  );
};
