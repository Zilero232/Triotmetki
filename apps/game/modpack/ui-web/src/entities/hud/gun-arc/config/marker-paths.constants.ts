const OCTAGON = 'M7.5 10H12.5L16 13.5V18.5L12.5 22H7.5L4 18.5V13.5Z';

export const MARKER_PATHS = {
  octagon: OCTAGON,
  centre: {
    line: { d: 'M10 6V26', filled: false },
    dot: { d: 'M7 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z', filled: true },
    triangle: { d: 'M10 12L14 20H6Z', filled: true },
    octagon: { d: OCTAGON, filled: false }
  }
} as const;
