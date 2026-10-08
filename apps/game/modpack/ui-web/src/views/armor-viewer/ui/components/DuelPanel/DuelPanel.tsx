import clsx from 'clsx';

import type { DuelPanelProps } from './DuelPanel.types';

import { AttackerPicker, DistanceSlider } from './components';

import s from './DuelPanel.module.scss';

export const DuelPanel = ({ state, onAttacker, onShell, onDistance }: DuelPanelProps) => {
  const { labels, shells, tank } = state;

  return (
    <div className={s.duel}>
      <div className={s.versus}>
        <AttackerPicker state={state} onPick={onAttacker} />
        <span className={s.vs}>{labels.versus}</span>
        <span className={s.target}>{tank?.name}</span>
      </div>
      <span className={s.caption}>{labels.shells}</span>
      <div className={s.shells}>
        {shells.map((shell, index) => (
          <button
            key={`${String(index)}-${shell.label}`}
            aria-pressed={shell.active}
            className={clsx(s.shell, shell.active && s.shellOn)}
            type='button'
            onClick={() => onShell(index)}
          >
            {shell.label}
          </button>
        ))}
        {shells.length === 0 && <span className={s.none}>{labels.no_shells}</span>}
      </div>
      <DistanceSlider
        label={labels.distance ?? ''}
        limits={state.distance_limits}
        template={labels.metres ?? ''}
        value={state.distance}
        onCommit={onDistance}
      />
    </div>
  );
};
