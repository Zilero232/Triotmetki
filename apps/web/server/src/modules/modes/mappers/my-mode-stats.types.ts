import type { myModeBattles } from '../queries/my-mode-stats.queries';

export type MyModeBattleRow = Awaited<ReturnType<typeof myModeBattles>>[number];
