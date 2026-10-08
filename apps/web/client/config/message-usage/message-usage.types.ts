export type ModuleScan = {
  dependencies: string[];
  paths: string[];
  isClient: boolean;
};

export type MessageUsageInput = {
  entries: readonly string[];
};

export type ResolveImportInput = {
  root: string;
  from: string;
  specifier: string;
};

export type ScanModuleInput = {
  root: string;
  file: string;
  namespaces: ReadonlySet<string>;
};

export type RuntimeDependenciesInput = Omit<ScanModuleInput, 'namespaces'> & {
  source: string;
};

export type KeyLiteralsInput = Pick<ScanModuleInput, 'namespaces'> & {
  source: string;
};

export type FirstGroupsInput = {
  source: string;
  pattern: RegExp;
};

export type CoverageInput = {
  key: string;
  paths: readonly string[];
};

export type PendingModule = {
  file: string;
  isClient: boolean;
};
