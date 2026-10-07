export const HUD_ICON = {
  imageScheme: 'img://',
  glyphScheme: 'otmetki:',
  fallbackSeparator: '|',
  renditions: [
    { pattern: /\/vehicleTypes\/(?:green|red)\/[^/]+\.png$/, box: { width: 17, height: 21 } },
    { pattern: /\/vehicleTypes\/white\/[^/]+\.png$/, box: { width: 16, height: 16 } },
    { pattern: /\/vehicleTypes\/gold\/[^/]+\.png$/, box: { width: 32, height: 32 } }
  ]
} as const;
