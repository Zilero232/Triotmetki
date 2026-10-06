import type { CacheTarget } from '../../api';

export type CacheRowsInput = {
  targets: readonly CacheTarget[];
  unchecked: ReadonlySet<string>;
  sizeOf: (bytes: number) => string;
};

export type ChosenTargetsInput = Omit<CacheRowsInput, 'sizeOf'>;

export type CacheRow = {
  id: string;
  name: string;
  location: CacheTarget['location'];
  path: string;
  size: string;
  files: number;
  checked: boolean;
};
