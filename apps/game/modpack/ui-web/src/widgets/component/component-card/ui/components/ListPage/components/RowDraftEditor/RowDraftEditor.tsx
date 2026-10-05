import { useT } from '@/entities/window/window-state';
import { ListItemActions, ListItemButton, ListItemInput } from '@/ui-kit';

import type { RowDraftEditorProps } from './RowDraftEditor.types';

export const RowDraftEditor = ({ item, draftValue }: RowDraftEditorProps) => {
  const t = useT();

  return (
    <ListItemActions>
      <ListItemInput aria-label={item.row.title} value={draftValue} onChange={(event) => item.editDraft(event.currentTarget.value)} />
      <ListItemButton variant='accent' onClick={item.submit}>
        {t('save')}
      </ListItemButton>
      <ListItemButton variant='ghost' onClick={item.cancel}>
        {t('cancel')}
      </ListItemButton>
    </ListItemActions>
  );
};
