export type ShowcaseMode = 'flat' | 'live' | 'still';

export type ShowcaseEnvironment = {
  hasWebgl: boolean;
  isCrawler: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  isCoarsePointer: boolean;
  cores: number | undefined;
  memoryGb: number | undefined;
};
