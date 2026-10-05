import { useT } from '@/entities/window/window-state';
import { Icon } from '@/ui-kit';

import type { AdvancedFieldsProps } from './AdvancedFields.types';

import { useAdvancedFields } from '../../model/hooks';
import { Field } from '../Field';

import s from './AdvancedFields.module.scss';

export const AdvancedFields = ({ fields, initiallyOpen, onSet }: AdvancedFieldsProps) => {
  const t = useT();
  const advanced = useAdvancedFields(initiallyOpen);

  return (
    <div className={s.advanced}>
      <button aria-expanded={advanced.isOpen} className={s.toggle} type='button' onClick={advanced.toggle}>
        <Icon name={advanced.isOpen ? 'chevron-down' : 'chevron-right'} size={14} tone='muted' />
        <span className={s.title}>{t('advancedFields')}</span>
        <span className={s.hint}>{t('advancedFieldsHint')}</span>
      </button>
      {advanced.isOpen && (
        <div className={s.fields}>
          {fields.map((field) => (
            <Field key={field.key} field={field} onSet={onSet} />
          ))}
        </div>
      )}
    </div>
  );
};
