export const CARD_PREVIEWS = {
  hangar_tweaks: 'carousel',
  battle_hotkeys: 'keys',
  bush_circle: 'keys',
  free_camera: 'keys',
  streamer_mode: 'keys',
  companion: 'checklist',
  depot_seller: 'checklist',
  auto_reserves: 'checklist',
  notification_filter: 'checklist',
  hangar_cleaner: 'checklist',
  preset_advisor: 'checklist'
} as const;

export const CARD_SUMMARY = {
  keyField: /(^|_)(hotkey|key)$/,
  noKey: 'none'
} as const;

export const CAROUSEL_PREVIEW = {
  rowsKey: 'carousel_rows',
  tilesKey: 'carousel_tiles',
  smallTiles: 'small',
  maxRows: 5,
  columns: 9,
  nativeRows: 1
} as const;
