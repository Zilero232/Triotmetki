import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';

import type { ScoreboardPlayerCellProps } from './ScoreboardPlayerCell.types';

import s from './ScoreboardPlayerCell.module.scss';

export const ScoreboardPlayerCell = ({ nickname, clanTag, isRecorder, isDestroyed }: ScoreboardPlayerCellProps) => {
  const t = useTranslations('replays.scoreboard');

  return (
    <span className={s.root} data-destroyed={isDestroyed} data-recorder={isRecorder}>
      <Link className={s.nickname} href={ROUTES.players.profile(nickname)}>
        {nickname}
      </Link>
      {clanTag && (
        <Link className={s.clan} href={ROUTES.clans.detail(clanTag)}>
          [{clanTag}]
        </Link>
      )}
      {isRecorder && <span className={s.marker}>{t('recorder')}</span>}
      {isDestroyed && <span className={s.srOnly}>{t('destroyed')}</span>}
    </span>
  );
};
