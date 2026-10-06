import { sendHud } from '@/shared/api/hud-protocol';

export const pressPanel = (id: string): void => {
  sendHud({ type: 'pressed', id });
};
