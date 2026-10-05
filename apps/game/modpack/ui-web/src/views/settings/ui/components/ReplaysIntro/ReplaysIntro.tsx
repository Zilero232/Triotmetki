import { ReplaysBrowser } from '@/widgets/replay/replays-browser';

import { useReplaysPage } from '../../../model/hooks';

export const ReplaysIntro = () => {
  const replays = useReplaysPage();

  return replays ? <ReplaysBrowser enabled={replays.enabled} page={replays.page} onTurnOn={replays.turnOn} /> : null;
};
