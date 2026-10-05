import Image from 'next/image';
import { match } from 'ts-pattern';

import type { HeroArtProps } from './HeroArt.types';

import { NationBackdrop, TankImage } from '../../../../atoms';
import { PAGE_HERO } from '../../PageHero.constants';

import s from './HeroArt.module.scss';

export const HeroArt = ({ art }: HeroArtProps) => (
  <div aria-hidden className={s.root} data-kind={art.kind}>
    {match(art)
      .with({ kind: 'tanks' }, ({ tanks }) => (
        <div className={s.tanks}>
          {tanks.slice(0, PAGE_HERO.maxTanks).map((tank) => (
            <span key={`${tank.nation}-${tank.name}`} className={s.tank} data-nation={tank.nation}>
              <TankImage isDecorative isPriority className={s.render} size='large' tank={tank} withTint={false} />
            </span>
          ))}
        </div>
      ))
      .with({ kind: 'flag' }, ({ nation }) => <NationBackdrop className={s.flag} fade='left' nation={nation} />)
      .with({ kind: 'emblem' }, ({ glyph }) => <span className={s.emblem}>{glyph}</span>)
      .with({ kind: 'clan' }, ({ emblem, color }) => (
        <span className={s.clan} style={{ '--clan': color ?? undefined }}>
          {emblem && <Image unoptimized alt='' height={PAGE_HERO.clanEmblem} src={emblem} width={PAGE_HERO.clanEmblem} />}
        </span>
      ))
      .exhaustive()}
  </div>
);
