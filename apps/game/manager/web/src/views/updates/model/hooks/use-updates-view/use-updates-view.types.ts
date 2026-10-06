export type ReleaseChange = {
  id: string;
  title: string;
  version: string | null;
  notes: string | null;
};

export type UpdateRelease = {
  version: string;
  date: string;
  games: string;
  notes: string | null;
  isInstalled: boolean;
  changes: ReleaseChange[];
};
