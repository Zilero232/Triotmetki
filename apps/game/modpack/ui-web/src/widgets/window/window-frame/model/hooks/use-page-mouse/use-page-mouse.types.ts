export type PageMouseHandlers = {
  onPress: (event: MouseEvent) => void;
  onMove: (event: MouseEvent) => void;
  onRelease: (event: MouseEvent) => void;
};

export type PickHandler = (handlers: PageMouseHandlers) => (event: MouseEvent) => void;
