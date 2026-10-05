export const SCHEMATIC = {
  native: 'native',
  on: 'on',
  minimap: {
    sizes: ['0', '1', '2', '3', '4', '5'],
    smallest: 0.55,
    sizeStep: 0.09,
    nativeScale: 0.73,
    names: { never: 'never', alt: 'alt', always: 'always' }
  },
  camera: {
    nativeZoom: 'native'
  }
} as const;
