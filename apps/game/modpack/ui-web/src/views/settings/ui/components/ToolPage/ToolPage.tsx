import { SECTION_ICONS, SECTION_TEXT, useScrollMemory, useT } from '@/entities/window/window-state';
import { PageHeader, ScrollArea } from '@/ui-kit';
import { SectionStrip } from '@/widgets/component/component-list';

import type { ToolPageProps } from './ToolPage.types';

import s from './ToolPage.module.scss';

export const ToolPage = ({ section, children, strip }: ToolPageProps) => {
  const t = useT();
  const scroll = useScrollMemory(section);

  return (
    <div className={s.page}>
      <PageHeader
        aside={strip && <SectionStrip section={strip} />}
        hint={t(SECTION_TEXT[section].hint)}
        icon={SECTION_ICONS[section]}
        title={t(SECTION_TEXT[section].title)}
      />
      <ScrollArea contentClassName={s.content} initialTop={scroll.initialTop} label={t(SECTION_TEXT[section].title)} onScrollEnd={scroll.onScrollEnd}>
        {children}
      </ScrollArea>
    </div>
  );
};
