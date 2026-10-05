import { send } from '@/shared/api/protocol';

export const closeWindow = (): void => {
  send({ type: 'close' });
};
