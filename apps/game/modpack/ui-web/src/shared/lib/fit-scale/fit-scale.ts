import type { FitPlacement, FitScaleInput, FitSize, RatioInput } from './fit-scale.types';

const ratio = ({ room, size }: RatioInput): number => (size > 0 && room > 0 ? room / size : 1);

export const fitScale = ({ frame, content, max = 1 }: FitScaleInput): number =>
  Math.min(max, ratio({ room: frame.width, size: content.width }), ratio({ room: frame.height, size: content.height }));

export const fitPlacement = (input: FitScaleInput): FitPlacement => {
  const { frame, content } = input;
  const measured = frame.width > 0 && frame.height > 0 && content.width > 0 && content.height > 0;
  const scale = measured ? fitScale(input) : 1;

  return {
    scale,
    x: measured ? Math.round((frame.width - content.width * scale) / 2) : 0,
    y: measured ? Math.round((frame.height - content.height * scale) / 2) : 0,
    measured
  };
};

export const elementSize = (element: HTMLElement | null): FitSize => ({ width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 });
