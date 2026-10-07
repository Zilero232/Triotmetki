import clsx from 'clsx';

import { Icon } from '@/ui-kit';

import type { ArmorProfileProps } from './ArmorProfile.types';

import s from './ArmorProfile.module.scss';

export const ArmorProfile = ({ profile, labels, isOpen, onToggle }: ArmorProfileProps) => {
  const weak = profile.zones.find((zone) => zone.id === profile.weak);

  return (
    <div className={s.profile}>
      <button aria-expanded={isOpen} className={s.head} type='button' onClick={onToggle}>
        <span className={s.title}>{labels.profile}</span>
        <span className={s.vehicle}>{profile.vehicle}</span>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} tone='muted' />
      </button>
      {isOpen && (
        <div className={s.body}>
          <span className={s.meta}>{profile.meta}</span>
          <div className={s.zones}>
            <div className={clsx(s.zone, s.zoneHead)}>
              <span className={s.zoneLabel}>{labels.zone}</span>
              <span className={s.zoneBar} />
              <span className={s.zoneCount}>{labels.profile_pens}</span>
            </div>
            {profile.zones.map((zone) => (
              <div key={zone.id} className={clsx(s.zone, zone.id === profile.weak && s.zoneWeak)}>
                <span className={s.zoneLabel}>{zone.label}</span>
                <span className={s.zoneBar}>
                  <span className={s.track}>
                    <span className={s.fill} style={{ width: `${String(zone.share ?? 0)}%` }} />
                  </span>
                </span>
                <span className={s.zoneCount}>{`${String(zone.pens)} / ${String(zone.hits)}`}</span>
              </div>
            ))}
          </div>
          {weak && profile.advice ? (
            <div className={s.weak}>
              <span className={s.weakTitle}>{`${labels.profile_weak ?? ''}: ${weak.label}`}</span>
              <span className={s.advice}>{profile.advice}</span>
            </div>
          ) : (
            <span className={s.few}>{labels.profile_few}</span>
          )}
          <span className={s.note}>{labels.profile_note}</span>
        </div>
      )}
    </div>
  );
};
