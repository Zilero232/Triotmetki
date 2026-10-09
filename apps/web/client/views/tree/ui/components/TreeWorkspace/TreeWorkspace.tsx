import { PathAside } from '../PathAside';
import { PremiumStrip } from '../PremiumStrip';
import { TreeCanvas } from '../TreeCanvas';

import s from './TreeWorkspace.module.scss';

export const TreeWorkspace = () => (
  <div className={s.root}>
    <div className={s.stage}>
      <TreeCanvas />
      <PathAside />
    </div>
    <PremiumStrip />
  </div>
);
