import { CardSwitch } from '@/features/component/toggle-component';
import { Icon } from '@/ui-kit';

import type { ComponentCardProps } from './ComponentCard.types';

import { useComponentCard } from '../model/hooks';
import { CardThumb, CardTitles } from './components';

import s from './ComponentCard.module.scss';

export const ComponentCard = ({ component, fields }: ComponentCardProps) => {
  const card = useComponentCard({ component, fields });

  return (
    <article className={s.card}>
      <button aria-haspopup='dialog' className={s.main} type='button' onClick={card.open}>
        <CardThumb card={card} />
        <CardTitles card={card} component={component} />
        <span className={s.chevron}>
          <Icon name='chevron-right' size={16} tone='muted' />
        </span>
      </button>
      <CardSwitch component={component} />
    </article>
  );
};
