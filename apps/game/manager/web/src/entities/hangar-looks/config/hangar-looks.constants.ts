export const HANGAR_LOOKS = {
  generator: 'hangar_looks',
  states: ['none', 'generated', 'skipped', 'failed'],
  reasons: ['unsupported_schema', 'invalid_recipe', 'disabled', 'untested_client', 'base_missing', 'missing_texture', 'shadowed', 'guid_collision']
} as const;
