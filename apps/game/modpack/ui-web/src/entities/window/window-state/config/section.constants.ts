export const SECTION = {
  battle: 'battle',
  hangar: 'hangar',
  replays: 'replays',
  data: 'data',
  profiles: 'profiles',
  hud: 'hud'
} as const;

export const SECTION_NAV = {
  components: [SECTION.battle, SECTION.hangar, SECTION.replays],
  tools: [SECTION.hud, SECTION.profiles, SECTION.data],
  first: SECTION.battle
} as const;
