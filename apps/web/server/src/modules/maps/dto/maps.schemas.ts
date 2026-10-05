import { z } from 'zod';

const pointSchema = z.tuple([z.number(), z.number()]);

const pointsByTeamSchema = z.record(z.string(), z.array(pointSchema)).catch({});

export const arenaDataSchema = z.object({
  boundingBox: z.object({ bottomLeft: pointSchema, upperRight: pointSchema }).nullish().catch(null),
  maxPlayersInTeam: z.number().nullish().catch(null),
  roundLength: z.number().nullish().catch(null),
  gameplay: z
    .array(
      z.object({
        type: z.string(),
        minimapImage: z.string().nullish().catch(null),
        teamBasePositions: pointsByTeamSchema,
        teamSpawnPoints: pointsByTeamSchema,
        controlPoints: z.array(pointSchema).catch([])
      })
    )
    .catch([])
});
