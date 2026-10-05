export type UseWheelScrollInput = {
  onScrolled?: () => void;
  contain?: boolean;
};

export type WheelScrollRef = (node: HTMLElement | null) => void;
