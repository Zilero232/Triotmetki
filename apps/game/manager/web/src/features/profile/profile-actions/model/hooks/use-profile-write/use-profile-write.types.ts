import type { ProfilesView } from '@/entities/profile';

export type UseProfileWriteInput<TVariables> = {
  clientPath: string | null;
  write: (variables: TVariables) => Promise<ProfilesView>;
  onWritten: () => void;
};
