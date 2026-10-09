import * as z from 'zod';

import type { BoardPeer, BoardPeersInput } from './board-peers.types';

import { BOARD_COLORS } from '../../config';

const peerStateSchema = z.object({
  name: z.string().min(1).nullable().catch(null),
  cursor: z.object({ x: z.number(), y: z.number() }).nullable().catch(null)
});

export const peerColor = (clientId: number): string => BOARD_COLORS[Math.abs(clientId) % BOARD_COLORS.length] ?? BOARD_COLORS[0];

export const boardPeers = ({ states, selfId }: BoardPeersInput): BoardPeer[] =>
  [...states.entries()].flatMap(([clientId, state]) => {
    if (clientId === selfId) {
      return [];
    }

    const { name, cursor } = peerStateSchema.parse(state);

    return [{ clientId, name, color: peerColor(clientId), cursor }];
  });
