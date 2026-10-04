export type CardPreviewKind = 'carousel' | 'checklist' | 'keys' | 'panel';

export type KeyChip = {
  key: string;
  label: string;
  value: string | null;
};

export type CardSummaryModel = {
  keys: KeyChip[];
  checked: string[];
};

export type CarouselPreviewModel = {
  rows: number | null;
  small: boolean;
};
