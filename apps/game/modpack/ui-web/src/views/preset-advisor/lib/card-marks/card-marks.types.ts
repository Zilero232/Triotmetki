export type MarkCardsInput = {
  root: Element;
  images: readonly string[];
  label: string;
};

export type MarkCardInput = {
  card: Element;
  label: string;
};

export type HasMarkInput = {
  element: Element;
  name: string;
};

export type ShowsImageInput = {
  url: string;
  images: readonly string[];
};
