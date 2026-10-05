export const CONTEXT_FILTER = {
  all: 'all',
  hangar: 'hangar',
  battle: 'battle'
} as const;

export const WINDOW_VIEW = {
  undoLimit: 20,
  searchMinLength: 2,
  cyrillic: { first: 1024, last: 1279 }
} as const;
