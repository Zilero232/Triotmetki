import type { ComponentProps } from 'react';

import { clsx } from 'clsx';

import type { CardHeaderProps, CardProps } from './Card.types';

import { cardVariants } from './Card.variants';

import s from './Card.module.scss';

export const Card = ({ variant = 'panel', padding = 'md', isInteractive = false, className, children, ...props }: CardProps) => (
  <div className={cardVariants({ variant, padding, isInteractive, class: className })} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ title, titleAs: Title = 'h3', meta, tabs, action, className, children, ...props }: CardHeaderProps) => (
  <div className={clsx(s.header, className)} {...props}>
    <div className={s.heading}>
      {title && <Title className={s.title}>{title}</Title>}
      {meta && <span className={s.meta}>{meta}</span>}
      {children}
    </div>
    {tabs && <div className={s.tabs}>{tabs}</div>}
    {action && <div className={s.action}>{action}</div>}
  </div>
);

export const CardBody = ({ className, ...props }: ComponentProps<'div'>) => <div className={clsx(s.body, className)} {...props} />;
