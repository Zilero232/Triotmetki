import { LestaAttribution } from '@/entities/app/lesta-attribution';

import s from './MiniAppFooter.module.scss';

export const MiniAppFooter = () => (
  <footer className={s.root}>
    <LestaAttribution variant='stacked' />
  </footer>
);
