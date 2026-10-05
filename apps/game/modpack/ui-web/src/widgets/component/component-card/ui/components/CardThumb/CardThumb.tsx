import { HudSample } from '@/features/hud/widget-registry';
import { FitBox, Icon } from '@/ui-kit';

import type { CardThumbProps } from './CardThumb.types';

import { CARD_THUMB } from '../../../config';
import { CarouselPreview } from '../CarouselPreview';

import s from './CardThumb.module.scss';

export const CardThumb = ({ card }: CardThumbProps) => {
  const fallback = <Icon name={card.icon} size={CARD_THUMB.fallbackIcon} tone='muted' />;

  if (card.thumb) {
    return (
      <span aria-hidden='true' className={s.thumb}>
        <img alt='' className={s.image} draggable={false} src={card.thumb} />
      </span>
    );
  }

  if (card.previewKind === 'panel' && card.preview) {
    return (
      <span aria-hidden='true' className={s.thumb}>
        <HudSample
          className={s.sample}
          fallback={fallback}
          minScale={CARD_THUMB.minScale}
          text={card.preview.text ?? card.preview.preview}
          widget={card.preview.widget}
        />
      </span>
    );
  }

  if (card.previewKind === 'carousel') {
    return (
      <span aria-hidden='true' className={s.thumb}>
        <FitBox className={s.sample}>
          <span className={s.carousel}>
            <CarouselPreview model={card.carousel} />
          </span>
        </FitBox>
      </span>
    );
  }

  return <span aria-hidden='true' className={s.slot} />;
};
