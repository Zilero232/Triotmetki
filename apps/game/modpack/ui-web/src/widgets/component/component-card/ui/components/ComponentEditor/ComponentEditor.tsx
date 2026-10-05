import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { CardSwitch } from '@/features/component/toggle-component';
import { Empty, Icon, ScrollArea } from '@/ui-kit';

import type { ComponentEditorProps } from './ComponentEditor.types';

import { useComponentEditor } from '../../../model/hooks';
import { CardTile } from '../CardTile';
import { EditorSection, EditorStage } from './components';

import s from './ComponentEditor.module.scss';

export const ComponentEditor = ({ component, compact = false }: ComponentEditorProps) => {
  const t = useT();
  const model = useComponentEditor({ component, compact });
  const hasControls = model.groups.length > 0 || model.card.showEmpty;

  return (
    <section aria-label={component.title} className={s.editor}>
      <header className={s.head}>
        <button aria-label={t('editorBack')} className={s.back} type='button' onClick={model.close}>
          <Icon name='arrow-left' size={16} tone='text' />
          <span className={s.backLabel}>{t('editorBack')}</span>
        </button>
        <span className={s.tile}>
          <CardTile enabled={model.card.enabled} icon={model.card.icon} />
        </span>
        <span className={s.title}>{component.title}</span>
        {model.card.changedCount > 0 && <span className={s.changed}>{`${model.card.changedCount} ${t('changedShort')}`}</span>}
        <span className={s.spacer} />
        <CardSwitch component={component} />
      </header>
      <div className={s.split}>
        {hasControls && (
          <div className={clsx(s.controls, compact && s.controlsCompact)} onMouseLeave={model.clearHint}>
            <ScrollArea contentClassName={s.groups} initialTop={model.focus.top} label={component.title}>
              <div ref={model.focus.frameRef} className={s.frame}>
                {model.card.showEmpty && <Empty>{t('noFields')}</Empty>}
                {model.groups.map((group) => (
                  <EditorSection
                    key={group.id}
                    focusKey={model.focusKey}
                    group={group}
                    lineRef={model.focus.lineRef}
                    onHint={model.showHint}
                    onSet={model.card.setField}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        <EditorStage compact={compact} component={component} model={model} />
      </div>
    </section>
  );
};
