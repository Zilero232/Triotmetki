export const SECTION = {
  battle: 'battle',
  hangar: 'hangar',
  marks: 'marks',
  replays: 'replays',
  streamer: 'streamer',
  data: 'data',
  profiles: 'profiles',
  hud: 'hud'
} as const;

export const SECTION_NAV = {
  components: [SECTION.battle, SECTION.hangar, SECTION.marks, SECTION.replays, SECTION.streamer, SECTION.data],
  tools: [SECTION.profiles, SECTION.hud],
  first: SECTION.battle
} as const;
