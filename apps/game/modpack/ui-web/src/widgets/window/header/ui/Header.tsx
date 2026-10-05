import { useT } from '@/entities/window/window-state';
import { SearchBox } from '@/features/component/search-components';
import { HeaderMenu } from '@/features/window/window-menu';
import { IconButton } from '@/ui-kit';

import type { HeaderProps } from './Header.types';

import { closeWindow } from '../model/actions';
import { useHeader } from '../model/hooks';
import { AccountChip, Brand } from './components';

import s from './Header.module.scss';

export const Header = ({ language, compact, frame }: HeaderProps) => {
  const t = useT();
  const header = useHeader();

  return (
    <header className={s.header}>
      <Brand compact={compact} dragRef={frame.handles.move} onRecentre={frame.onRecentre} />
      <SearchBox query={header.query} onChange={header.setQuery} onClear={header.clearQuery} />
      <div className={s.actions}>
        {header.account && <AccountChip account={header.account} compact={compact} onOpen={header.openAccount} />}
        <HeaderMenu frame={frame} language={language} />
        <IconButton className={s.close} icon='x' label={t('close')} variant='ghost' onClick={closeWindow} />
      </div>
    </header>
  );
};
