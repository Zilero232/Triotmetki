import clsx from 'clsx';

import { HudSample } from '@/features/hud/widget-registry';
import { FitBox, Icon } from '@/ui-kit';

import type { CardThumbProps } from './CardThumb.types';

import { CARD_THUMB } from '../../../config';
import { CarouselPreview } from '../CarouselPreview';

import s from './CardThumb.module.scss';

const ThumbContent = ({ card }: CardThumbProps) => {
  const fallback = <Icon name={card.icon} size={CARD_THUMB.fallbackIcon} tone={card.enabled ? 'text' : 'muted'} />;

  if (card.thumb) {
    return <img alt='' className={s.image} draggable={false} src={card.thumb} />;
  }

  if (card.previewKind === 'panel' && card.preview) {
    return (
      <HudSample
        className={s.sample}
        fallback={fallback}
        minScale={CARD_THUMB.minScale}
        text={card.preview.text ?? card.preview.preview}
        widget={card.preview.widget}
      />
    );
  }

  if (card.previewKind === 'carousel') {
    return (
      <FitBox className={s.sample} contentKey={JSON.stringify(card.carousel)}>
        <span className={s.carousel}>
          <CarouselPreview model={card.carousel} />
        </span>
      </FitBox>
    );
  }

  return <span className={s.icon}>{fallback}</span>;
};

export const CardThumb = ({ card }: CardThumbProps) => (
  <span aria-hidden='true' className={clsx(s.thumb, !card.enabled && s.thumbOff)}>
    <ThumbContent card={card} />
  </span>
);
