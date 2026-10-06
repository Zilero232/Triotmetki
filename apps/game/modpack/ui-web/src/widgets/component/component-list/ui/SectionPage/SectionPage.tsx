import { SECTION_ICONS, SECTION_TEXT, useT } from '@/entities/window/window-state';
import { Empty, PageHeader, ScrollArea } from '@/ui-kit';

import type { SectionPageProps } from './SectionPage.types';

import { useSectionPage } from '../../model/hooks';
import { CardColumns } from '../components';
import { SectionStrip } from '../SectionStrip';

import s from './SectionPage.module.scss';

export const SectionPage = ({ section, columns, card, intro, strip = false }: SectionPageProps) => {
  const t = useT();
  const page = useSectionPage({ section, columns });

  return (
    <div className={s.page}>
      <PageHeader
        aside={strip && <SectionStrip section={section} />}
        hint={t(SECTION_TEXT[section].hint)}
        icon={SECTION_ICONS[section]}
        title={t(SECTION_TEXT[section].title)}
      />
      <ScrollArea
        contentClassName={s.content}
        initialTop={page.scroll.initialTop}
        label={t(SECTION_TEXT[section].title)}
        onScrollEnd={page.scroll.onScrollEnd}
      >
        {intro}
        {!strip && page.empty && <Empty>{t('sectionEmpty')}</Empty>}
        {!strip && <CardColumns card={card} columns={page.columns} />}
      </ScrollArea>
    </div>
  );
};
