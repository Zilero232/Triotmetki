'use client';

import { toRoman } from '@otmetki/icons';
import { clsx } from 'clsx';
import Image from 'next/image';

import { useImageFallback } from '@/shared/lib';

import type { TankImageProps } from './TankImage.types';

import { ClassIcon } from '../ClassIcon';
import { TANK_IMAGE } from './TankImage.constants';

import s from './TankImage.module.scss';

export const TankImage = ({
  tank,
  size,
  withTint = size === 'big' || size === 'large',
  isPriority = false,
  isDecorative = false,
  withFallback = true,
  className
}: TankImageProps) => {
  const { width, height, glyph, sources, isOptimized, sizes } = TANK_IMAGE[size];
  const { image, onError } = useImageFallback(sources.map((key) => tank.images?.[key]));

  if (!image && !withFallback) {
    return null;
  }

  return (
    <span
      className={clsx(s.root, s[size], className)}
      data-nation={tank.nation}
      data-premium={tank.isPremium || undefined}
      data-source={image !== null && image === tank.images?.big ? 'big' : undefined}
      data-state={image ? 'image' : 'fallback'}
      data-tint={withTint || undefined}
    >
      {image ? (
        <Image
          alt={isDecorative ? '' : tank.name}
          className={s.image}
          fetchPriority={isPriority ? 'high' : undefined}
          height={height}
          loading={isPriority ? 'eager' : undefined}
          sizes={sizes}
          src={image}
          unoptimized={!isOptimized}
          width={width}
          onError={onError}
        />
      ) : (
        <span
          aria-hidden={isDecorative || undefined}
          aria-label={isDecorative ? undefined : tank.name}
          className={s.fallback}
          role={isDecorative ? undefined : 'img'}
        >
          <ClassIcon size={glyph} tankClass={tank.type} variant={tank.isPremium ? 'premium' : 'regular'} />
          <span aria-hidden className={s.tier}>
            {toRoman(tank.tier)}
          </span>
        </span>
      )}
    </span>
  );
};
