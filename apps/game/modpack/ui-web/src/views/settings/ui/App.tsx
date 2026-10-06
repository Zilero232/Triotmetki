import { useT } from '@/entities/window/window-state';
import { UndoToast } from '@/features/window/undo-change';
import { Header } from '@/widgets/window/header';
import { Notice } from '@/widgets/window/notice';
import { Sidebar } from '@/widgets/window/sidebar';
import { WindowFrame } from '@/widgets/window/window-frame';

import { useApp } from '../model/hooks';
import { Content } from './components';

import s from './App.module.scss';

export const App = () => {
  const t = useT();
  const app = useApp();

  if (!app.state) {
    return (
      <div aria-live='polite' className={s.empty} role='status'>
        {t(app.placeholderKey)}
      </div>
    );
  }

  return (
    <WindowFrame frame={app.frame} label={t('title')}>
      <Header compact={app.compact} frame={app.frame} language={app.state.language} />
      <div className={s.body}>
        <Sidebar compact={app.compact} />
        <main className={s.content}>
          <Content
            columns={app.columns}
            compact={app.compact}
            editing={app.editing}
            hasReplays={app.hasReplays}
            searching={app.searching}
            section={app.section}
            state={app.state}
          />
        </main>
      </div>
      <UndoToast />
      {app.state.notice && <Notice key={app.state.revision} notice={app.state.notice} />}
    </WindowFrame>
  );
};
