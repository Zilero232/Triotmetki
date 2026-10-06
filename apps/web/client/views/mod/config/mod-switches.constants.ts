export const MOD_SWITCHES = [
  { id: 'battleResults', setting: 'send_battle_results', value: 'on' },
  { id: 'moeSnapshots', setting: 'send_moe_snapshots', value: 'on' },
  { id: 'queueTimes', setting: 'send_queue_times', value: 'on' },
  { id: 'loadouts', setting: 'send_loadouts', value: 'on' },
  { id: 'shots', setting: 'send_shots', value: 'on' },
  { id: 'badge', setting: 'show_pack_badge', value: 'on' },
  { id: 'shareSettings', setting: 'share_settings', value: 'manual' },
  { id: 'replays', setting: 'upload_replays', value: 'off' }
] as const;

export const MOD_SWITCH_TONE = {
  on: 'success',
  manual: 'neutral',
  off: 'steel'
} as const;

export const MOD_TUNABLES = [{ id: 'idle', setting: 'session_idle_minutes', value: 60 }] as const;
