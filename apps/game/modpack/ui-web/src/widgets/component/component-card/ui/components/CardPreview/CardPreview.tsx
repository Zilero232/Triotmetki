import type { CardPreviewProps } from './CardPreview.types';

import { CardSummary } from '../CardSummary';
import { CarouselPreview } from '../CarouselPreview';
import { PanelPreview } from '../PanelPreview';

import s from './CardPreview.module.scss';

export const CardPreview = ({ card }: CardPreviewProps) => {
  if (card.previewKind === 'panel') {
    return <PanelPreview panel={card.preview} onMove={card.moveOnScreen} />;
  }

  if (card.previewKind === 'carousel') {
    return (
      <div className={s.preview}>
        <CarouselPreview model={card.carousel} />
      </div>
    );
  }

  if (card.previewKind === 'keys' || card.previewKind === 'checklist') {
    return (
      <div className={s.preview}>
        <CardSummary kind={card.previewKind} summary={card.summary} />
      </div>
    );
  }

  return null;
};
