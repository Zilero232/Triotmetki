import { createRoot } from 'react-dom/client';

import { App } from './ui/App';

import '@fontsource/fira-sans/400.css';
import '@fontsource/fira-sans/500.css';
import '@fontsource/fira-sans-condensed/600.css';
import '@fontsource/fira-sans-condensed/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/global.scss';

const mount = () => {
  const root = document.getElementById('root');

  if (root) {
    createRoot(root).render(<App />);
  }
};

if (import.meta.env.DEV) {
  void import('./lib').then(({ installDevIpcOnRequest }) => {
    installDevIpcOnRequest();
    mount();
  });
} else {
  mount();
}
