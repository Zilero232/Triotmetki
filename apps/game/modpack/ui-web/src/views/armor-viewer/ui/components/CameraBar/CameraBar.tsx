import { Button, Icon } from '@/ui-kit';

import type { CameraBarProps } from './CameraBar.types';

import s from './CameraBar.module.scss';

export const CameraBar = ({ cameras, labels, onCamera, onSite }: CameraBarProps) => (
  <div className={s.column}>
    <div className={s.bar}>
      <span className={s.caption}>{labels.camera}</span>
      {cameras.map((camera) => (
        <button key={camera.id} className={s.preset} type='button' onClick={() => onCamera(camera.id)}>
          {camera.label}
        </button>
      ))}
      <span className={s.divider} />
      <Button size='small' tooltip={labels.site_hint} variant='ghost' onClick={onSite}>
        <span className={s.site}>
          {labels.site}
          <Icon name='external-link' size={12} tone='muted' />
        </span>
      </Button>
    </div>
    <span className={s.hint}>{labels.hint}</span>
  </div>
);
