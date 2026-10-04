import clsx from 'clsx';

import type { ComponentCardProps } from './ComponentCard.types';

import { Icon } from '../../../shared/ui/icon';
import { useComponentCard } from '../model/hooks';
import { CardBody, CardSwitch, CardThumb, CardTile, CardTitles } from './components';

import s from './ComponentCard.module.scss';

export const ComponentCard = ({ component, fields, forceOpen }: ComponentCardProps) => {
  const card = useComponentCard({ component, fields, forceOpen });

  return (
    <article className={clsx(s.card, card.open && s.open)}>
      <div className={s.head}>
        <button
          aria-expanded={card.expandable && !card.hasEditor ? card.open : undefined}
          aria-haspopup={card.hasEditor ? 'dialog' : undefined}
          className={s.main}
          type='button'
          onClick={card.toggleOpen}
        >
          <CardTile enabled={card.enabled} icon={card.icon} />
          <CardTitles card={card} component={component} />
          {!card.open && <CardThumb card={card} />}
          {card.expandable && (
            <span className={s.chevron}>
              <Icon name={card.chevron} tone='text' />
            </span>
          )}
        </button>
        <CardSwitch card={card} component={component} />
      </div>
      {card.open && <CardBody card={card} component={component} />}
    </article>
  );
};
