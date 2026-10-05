export const SITE_SYNC = {
  outcomes: ['up_to_date', 'pushed', 'pulled', 'merged', 'conflict'],
  resolutions: ['merge', 'keep_local', 'take_remote'],
  libraries: ['profiles']
} as const;
