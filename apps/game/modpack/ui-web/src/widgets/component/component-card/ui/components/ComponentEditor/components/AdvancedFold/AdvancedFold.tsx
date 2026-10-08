import { Icon } from '@/ui-kit';

import type { AdvancedFoldProps } from './AdvancedFold.types';

import { EditorLine } from '../EditorLine';

import s from './AdvancedFold.module.scss';

export const AdvancedFold = ({ group, isOpen, focusKey, lineRef, onToggle, onSet, onHint }: AdvancedFoldProps) => (
  <div aria-label={group.label} className={s.fold} role='group'>
    <button aria-expanded={isOpen} className={s.head} type='button' onClick={onToggle}>
      <span className={s.title}>{group.label}</span>
      <span className={s.count}>{group.rows.length}</span>
      <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} tone='muted' />
    </button>
    {isOpen && (
      <div className={s.body}>
        {group.rows.map((row) => {
          const isFocused = row.field.key === focusKey;

          return (
            <EditorLine key={row.field.key} focused={isFocused} lineRef={isFocused ? lineRef : undefined} row={row} onHint={onHint} onSet={onSet} />
          );
        })}
      </div>
    )}
  </div>
);
