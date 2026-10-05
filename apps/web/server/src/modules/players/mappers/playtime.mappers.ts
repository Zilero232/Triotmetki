import type { Playtime } from '@otmetki/schemas';

import { sumBy } from 'remeda';

import type { PlaytimeResultInput } from '../players.types';

import { playtimeCells } from '../lib/playtime/playtime';

export const toPlaytime = ({ rows, source }: PlaytimeResultInput): Playtime => ({
  battles: Math.round(sumBy(rows, (row) => row.battles)),
  source,
  cells: playtimeCells(rows)
});
