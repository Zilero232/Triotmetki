import clsx from 'clsx';

import { ScrollArea } from '@/ui-kit';

import type { EditorStageProps } from './EditorStage.types';

import { CardPreview } from '../../../CardPreview';
import { ListPage } from '../../../ListPage';
import { EditorActions } from '../EditorActions';
import { EditorScreen } from '../EditorScreen';

import s from './EditorStage.module.scss';

export const EditorStage = ({ component, model, compact }: EditorStageProps) => {
  const { card, hint } = model;

  return (
    <div className={s.stage}>
      {model.hasScreen ? <EditorScreen model={model} /> : <CardPreview card={card} />}
      <div aria-live='polite' className={clsx(s.hint, compact && s.hintCompact)}>
        <span className={s.hintLabel}>{hint.label}</span>
        {hint.text && <span className={s.hintText}>{hint.text}</span>}
      </div>
      <EditorActions compact={compact} component={component} model={model} />
      {component.page?.kind === 'list' && (
        <div className={s.page}>
          <ScrollArea contentClassName={s.pageContent} label={component.title}>
            <ListPage page={component.page} onRun={card.run} />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
