import { clsx } from 'clsx';

import { Avatar } from '@/ui-kit';

import type { PlayerIdentityProps } from './PlayerIdentity.types';

import { clanLabel } from '../../lib/clan-label';

import s from './PlayerIdentity.module.scss';

export const PlayerIdentity = ({ player, size = 'md', withAvatar = true, className }: PlayerIdentityProps) => (
  <span className={clsx(s.root, s[size], className)}>
    {withAvatar && <Avatar name={player.nickname} size={size === 'lg' ? 'lg' : 'sm'} />}
    <span className={s.text}>
      <span className={s.nickname} title={player.nickname}>
        {player.nickname}
      </span>
      {player.clanTag && <span className={s.clan}>{clanLabel({ tag: player.clanTag })}</span>}
    </span>
  </span>
);
