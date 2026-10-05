import { useTranslations } from 'use-intl';

import { Button, Tooltip } from '@/ui-kit';

import { useStatusDock } from '../../../model/hooks';

import s from './StatusDock.module.scss';

export const StatusDock = () => {
  const t = useTranslations('nav.dock');
  const { isLoading, tone, primary, secondary, hint, action, onOpenHome } = useStatusDock();

  return (
    <section aria-busy={isLoading || undefined} aria-label={t('label')} className={s.root} data-tone={tone}>
      <Tooltip content={hint} side='right'>
        <button aria-live='polite' className={s.summary} type='button' onClick={onOpenHome}>
          <span aria-hidden className={s.dot} />
          {isLoading ? (
            <span aria-hidden className={s.lines}>
              <span className={s.skeleton} />
              <span className={s.skeleton} />
            </span>
          ) : (
            <span className={s.lines}>
              <span className={s.primary}>{primary}</span>
              <span className={s.secondary}>{secondary}</span>
            </span>
          )}
        </button>
      </Tooltip>
      {action && (
        <Button className={s.action} isPending={action.isPending} size='sm' title={action.label} variant={action.variant} onClick={action.onRun}>
          {!action.isPending && <action.icon aria-hidden />}
          <span className={s.actionLabel}>{action.label}</span>
        </Button>
      )}
    </section>
  );
};
