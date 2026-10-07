import { Gauge, Lock, PlayCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { ComponentPreview, FairPlayNote, PERF, PreviewAudio } from '@/entities/catalog';
import { HANGAR_LOOKS } from '@/entities/hangar-looks';
import { ComponentToggle } from '@/features/component/component-toggle';
import { Badge, ExternalLink } from '@/ui-kit';

import type { ComponentCardProps } from './ComponentCard.types';

import { COMPONENT_CATALOG } from '../../../config';
import { HangarLooksNote } from '../HangarLooksNote';

import s from './ComponentCard.module.scss';

export const ComponentCard = ({ clientPath, isInstalled, row }: ComponentCardProps) => {
  const t = useTranslations('components');

  return (
    <article className={s.root} data-state={row.state}>
      <ComponentPreview category={row.category} src={row.previewSrc} />
      <div className={s.body}>
        <header className={s.header}>
          <h3 className={s.title}>{row.title}</h3>
          {row.state === COMPONENT_CATALOG.missingState && <Badge tone='warning'>{t('state.missing')}</Badge>}
          {row.isNew && (
            <Badge icon={<Sparkles aria-hidden />} tone='premium'>
              {t('new')}
            </Badge>
          )}
          {row.required && (
            <Badge icon={<Lock aria-hidden />} tone='accent'>
              {t('required')}
            </Badge>
          )}
          {row.perf && (
            <Badge icon={<Gauge aria-hidden />} tone={PERF.tones[row.perf]}>
              {t(`perf.${row.perf}`)}
            </Badge>
          )}
        </header>
        <p className={s.description}>{row.description}</p>
        {row.fairPlay && (
          <FairPlayNote>
            <span>
              <strong>{t('fairPlay')}:</strong> {row.fairPlay}
            </span>
          </FairPlayNote>
        )}
        {row.generator === HANGAR_LOOKS.generator && row.state === 'enabled' && <HangarLooksNote clientPath={clientPath} />}
        <footer className={s.footer}>
          {row.dependencies.length > 0 && <span className={s.dependencies}>{t('dependencies', { list: row.dependencies.join(', ') })}</span>}
          {row.libraries.length > 0 && <span className={s.dependencies}>{t('libraries', { list: row.libraries.join(', ') })}</span>}
          {row.video && (
            <ExternalLink href={row.video}>
              <PlayCircle aria-hidden />
              {t('video')}
            </ExternalLink>
          )}
          <PreviewAudio className={s.audio} label={t('listen', { title: row.title })} src={row.audioSrc} />
        </footer>
      </div>
      <div className={s.toggle}>
        <ComponentToggle
          checked={row.state === 'enabled'}
          clientPath={clientPath}
          componentId={row.id}
          disabled={!isInstalled}
          isLocked={row.required}
          libraries={row.libraries}
          title={row.title}
        />
      </div>
    </article>
  );
};
