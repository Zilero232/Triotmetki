import clsx from 'clsx';

import type { SwatchPickerProps } from './SwatchPicker.types';

import s from './SwatchPicker.module.scss';

export const SwatchPicker = ({ label, rows, onSelect, onHint }: SwatchPickerProps) => (
  <div aria-label={label} className={s.swatches} role='group'>
    {rows.map((row) => (
      <div key={row[0]?.value} className={s.row}>
        {row.map((option) => (
          <button
            key={option.value}
            aria-label={option.label}
            aria-pressed={option.selected}
            className={clsx(s.swatch, option.selected && s.swatchOn)}
            type='button'
            onClick={() => onSelect(option.value)}
            onFocus={() => onHint(option.label)}
            onMouseEnter={() => onHint(option.label)}
          >
            <span className={s.chip} style={option.swatch ? { backgroundColor: option.swatch } : undefined} />
          </button>
        ))}
      </div>
    ))}
  </div>
);
