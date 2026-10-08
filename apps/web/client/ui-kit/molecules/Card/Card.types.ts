import type { ComponentProps, ReactNode } from 'react';

type CardVariant = 'band' | 'media' | 'panel' | 'well';

export type CardProps = ComponentProps<'div'> & {
  variant?: CardVariant;
  padding?: 'lg' | 'md' | 'none' | 'sm';
  isInteractive?: boolean;
};

export type CardHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  title?: ReactNode;
  titleAs?: 'h2' | 'h3';
  meta?: ReactNode;
  tabs?: ReactNode;
  action?: ReactNode;
};
