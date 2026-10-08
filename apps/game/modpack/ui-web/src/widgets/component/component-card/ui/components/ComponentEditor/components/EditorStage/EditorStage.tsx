import clsx from 'clsx';

import { ScrollArea } from '@/ui-kit';

import type { EditorStageProps } from './EditorStage.types';

import { CardPreview } from '../../../CardPreview';
import { ListPage } from '../../../ListPage';
import { AdvancedFold } from '../AdvancedFold';
import { EditorActions } from '../EditorActions';
import { EditorScreen } from '../EditorScreen';

import s from './EditorStage.module.scss';

export const EditorStage = ({ component, model, compact }: EditorStageProps) => {
  const { card, hint, folded } = model;

  return (
    <div className={s.stage}>
      {model.hasScreen ? <EditorScreen model={model} tall={component.page?.kind === 'list'} /> : <CardPreview card={card} />}
      <div aria-live='polite' className={clsx(s.hint, compact && s.hintCompact)}>
        <span className={s.hintLabel}>{hint.label}</span>
        {hint.text && <span className={s.hintText}>{hint.text}</span>}
      </div>
      <EditorActions compact={compact} component={component} model={model} />
      {component.page?.kind === 'list' && (
        <div className={s.page}>
          {component.page.title && (
            <div className={s.pageHead}>
              <span className={s.pageTitle}>{component.page.title}</span>
              {component.page.rows.length > 0 && <span className={s.pageCount}>{component.page.rows.length}</span>}
            </div>
          )}
          <ScrollArea contentClassName={s.pageContent} label={component.title}>
            <ListPage compact={compact} page={component.page} onRun={card.run} />
            {folded && (
              <AdvancedFold
                focusKey={model.focusKey}
                group={folded}
                isOpen={model.isFoldOpen}
                lineRef={model.focus.lineRef}
                onHint={model.showHint}
                onSet={card.setField}
                onToggle={model.toggleFold}
              />
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
