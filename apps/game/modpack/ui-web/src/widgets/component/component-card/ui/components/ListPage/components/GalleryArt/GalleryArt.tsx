import clsx from 'clsx';

import { Icon } from '@/ui-kit';

import type { GalleryArtProps } from './GalleryArt.types';

import { artStyle } from '../../../../../lib/gallery-art';

import s from './GalleryArt.module.scss';

export const GalleryArt = ({ image, title, badge, isChosen }: GalleryArtProps) => (
  <span className={s.art}>
    <span className={s.placeholder}>
      <Icon name='warehouse' size={24} tone={isChosen ? 'accent' : 'muted'} />
      <span className={s.name}>{title}</span>
    </span>
    {image && <span className={s.image} style={artStyle(image)} />}
    <span className={s.scrim} />
    {badge && <span className={clsx(s.badge, isChosen && s.badgeOn)}>{badge}</span>}
    {isChosen && (
      <span className={s.check}>
        <Icon name='check' size={12} tone='contrast' />
      </span>
    )}
  </span>
);
