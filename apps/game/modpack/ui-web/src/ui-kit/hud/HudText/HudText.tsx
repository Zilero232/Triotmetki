import type { HudTextProps } from './HudText.types';

export const HudText = ({ text, className, color = null }: HudTextProps) => {
  if (text === null) {
    return null;
  }

  return (
    <span className={className} style={color === null ? undefined : { color }}>
      {text}
    </span>
  );
};
