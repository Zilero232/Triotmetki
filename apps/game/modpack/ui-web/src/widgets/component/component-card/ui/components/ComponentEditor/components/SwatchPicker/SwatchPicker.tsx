import clsx from 'clsx';

import type { SwatchPickerProps } from './SwatchPicker.types';

import s from './SwatchPicker.module.scss';

export const SwatchPicker = ({ label, options, onSelect, onHint }: SwatchPickerProps) => (
  <div aria-label={label} className={s.swatches} role='group'>
    {options.map((option) => (
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
);
