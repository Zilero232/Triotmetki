export const RETICLE_MARKS = {
  grid: 32,
  sourceSize: 32,
  outlineWidth: 1,
  paint: {
    mark: '#ffffff',
    outline: '#0b0c0e',
    opacity: { mark: 1, outline: 0.9, shade: 0.55 }
  },
  shapeIds: [
    'chevron_thin',
    'chevron',
    'chevron_bold',
    'chevron_small',
    'chevron_down',
    'cross',
    'cross_small',
    'cross_gap',
    'arrow',
    'dot',
    'dot_small',
    'ring',
    'ring_filled',
    'angles',
    'parens',
    'brackets',
    'corners',
    'x',
    'diamond'
  ],
  shapes: {
    chevron_thin: [
      {
        kind: 'line',
        weight: 1,
        points: [
          [-7, 6],
          [0, 0],
          [7, 6]
        ]
      }
    ],
    chevron: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-7, 6],
          [0, 0],
          [7, 6]
        ]
      }
    ],
    chevron_bold: [
      {
        kind: 'line',
        weight: 3,
        points: [
          [-7, 6],
          [0, 0],
          [7, 6]
        ]
      }
    ],
    chevron_small: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-4, 4],
          [0, 0],
          [4, 4]
        ]
      }
    ],
    chevron_down: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-7, -6],
          [0, 0],
          [7, -6]
        ]
      }
    ],
    cross: [
      {
        kind: 'line',
        weight: 1,
        points: [
          [-11, 0],
          [11, 0]
        ]
      },
      {
        kind: 'line',
        weight: 1,
        points: [
          [0, -11],
          [0, 11]
        ]
      }
    ],
    cross_small: [
      {
        kind: 'line',
        weight: 1,
        points: [
          [-5, 0],
          [5, 0]
        ]
      },
      {
        kind: 'line',
        weight: 1,
        points: [
          [0, -5],
          [0, 5]
        ]
      }
    ],
    cross_gap: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-11, 0],
          [-4, 0]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [4, 0],
          [11, 0]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [0, -11],
          [0, -4]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [0, 4],
          [0, 11]
        ]
      }
    ],
    arrow: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [0, -12],
          [0, -1]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [-4, -4],
          [0, 0],
          [4, -4]
        ]
      }
    ],
    dot: [{ kind: 'disc', r: 2.5, paint: 'mark' }],
    dot_small: [{ kind: 'disc', r: 1.5, paint: 'mark' }],
    ring: [{ kind: 'ring', r: 6, weight: 2 }],
    ring_filled: [
      { kind: 'disc', r: 6, paint: 'shade' },
      { kind: 'ring', r: 6, weight: 2 }
    ],
    angles: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-5, -4],
          [-9, 0],
          [-5, 4]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [5, -4],
          [9, 0],
          [5, 4]
        ]
      },
      { kind: 'disc', r: 1.5, paint: 'mark' }
    ],
    parens: [
      { kind: 'arc', r: 9, from: 140, to: 220, weight: 2 },
      { kind: 'arc', r: 9, from: -40, to: 40, weight: 2 },
      { kind: 'disc', r: 1.5, paint: 'mark' }
    ],
    brackets: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-6, -8],
          [-9, -8],
          [-9, 8],
          [-6, 8]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [6, -8],
          [9, -8],
          [9, 8],
          [6, 8]
        ]
      }
    ],
    corners: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-9, -5],
          [-9, -9],
          [-5, -9]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [5, -9],
          [9, -9],
          [9, -5]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [9, 5],
          [9, 9],
          [5, 9]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [-5, 9],
          [-9, 9],
          [-9, 5]
        ]
      }
    ],
    x: [
      {
        kind: 'line',
        weight: 2,
        points: [
          [-6, -6],
          [6, 6]
        ]
      },
      {
        kind: 'line',
        weight: 2,
        points: [
          [-6, 6],
          [6, -6]
        ]
      }
    ],
    diamond: [
      {
        kind: 'line',
        weight: 2,
        closed: true,
        points: [
          [0, -7],
          [7, 0],
          [0, 7],
          [-7, 0]
        ]
      },
      { kind: 'disc', r: 1.5, paint: 'mark' }
    ]
  }
} as const;
