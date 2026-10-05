import type { HitStepInput } from './hit-step.types';

export const hitStep = ({ indexes, selected, step }: HitStepInput): number | null => {
  if (indexes.length === 0) {
    return null;
  }

  const position = selected === null ? -1 : indexes.indexOf(selected);
  const next = position === -1 ? 0 : (position + step + indexes.length) % indexes.length;

  return indexes[next] ?? null;
};
