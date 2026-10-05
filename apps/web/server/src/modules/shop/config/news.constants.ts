export const NEWS_ENRICH = {
  batch: 200,
  versionPattern: /(?:обновлени[еяю]|патч|update|версия)\s*(\d+\.\d+(?:\.\d+){0,2})/iu,
  patchKind: /обновлени|патч|update|список изменений/i,
  minTankNameLength: 3
} as const;
