import type { ComponentEditorProps } from './ComponentEditor.types';

import { useT } from '../../../../../entities/window-state';
import { IconButton } from '../../../../../shared/ui/icon-button';
import { ScrollArea } from '../../../../../shared/ui/scroll-area';
import { useComponentEditor } from '../../../model/hooks';
import { CardSwitch } from '../CardSwitch';
import { CardTile } from '../CardTile';
import { EditorSection, EditorStage } from './components';

import s from './ComponentEditor.module.scss';

export const ComponentEditor = ({ component, editor }: ComponentEditorProps) => {
  const t = useT();
  const model = useComponentEditor({ component, editor });

  return (
    <section aria-label={component.title} className={s.editor}>
      <header className={s.head}>
        <IconButton icon='x' label={t('editorClose')} variant='ghost' onClick={model.close} />
        <span className={s.tile}>
          <CardTile enabled={model.card.enabled} icon={model.card.icon} />
        </span>
        <span className={s.title}>{component.title}</span>
        {model.card.changedCount > 0 && <span className={s.changed}>{`${model.card.changedCount} ${t('changedShort')}`}</span>}
        <span className={s.spacer} />
        <CardSwitch card={model.card} component={component} />
      </header>
      <div className={s.split}>
        <div className={s.controls} onMouseLeave={model.clearHint}>
          <ScrollArea contentClassName={s.groups} label={component.title}>
            {model.groups.map((group) => (
              <EditorSection key={group.id} group={group} onHint={model.showHint} onSet={model.card.setField} />
            ))}
          </ScrollArea>
        </div>
        <EditorStage component={component} model={model} />
      </div>
    </section>
  );
};
