export const COMPONENT_SET = {
  maxSets: 12,
  nameMaxLength: 40,
  codePrefix: 'TS1.',
  codeMaxLength: 16 * 1024,
  fileExtension: 'tmset',
  fileNameUnsafe: /[\p{Cc}\\/:*?"<>|]/gu,
  fileNameTrailing: /[. ]+$/,
  fileNameReplacement: '_',
  fileNameFallback: 'set'
} as const;
