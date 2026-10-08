import clsx from 'clsx';

import type { GalleryTileProps } from './GalleryTile.types';

import { GalleryArt } from '../GalleryArt';

import s from './GalleryTile.module.scss';

export const GalleryTile = ({ item, compact = false }: GalleryTileProps) => {
  const { row } = item;
  const [choose] = item.actions;
  const isChosen = choose === undefined;

  return (
    <div className={clsx(s.cell, compact && s.cellCompact)} role='listitem'>
      <button
        aria-label={row.title}
        aria-pressed={isChosen}
        className={clsx(s.tile, isChosen && s.tileOn)}
        disabled={isChosen}
        type='button'
        onClick={choose?.onClick}
      >
        <GalleryArt badge={row.badge} image={row.image} isChosen={isChosen} title={row.title} />
        <span className={s.text}>
          <span className={s.title}>{row.title}</span>
          {row.subtitle && <span className={s.subtitle}>{row.subtitle}</span>}
          {row.meta && <span className={s.meta}>{row.meta}</span>}
        </span>
      </button>
    </div>
  );
};
