import { useBoolean } from '@siberiacancode/reactuse';

import { useEscapeLayer } from '@/shared/lib/use-escape-layer';

export const useChoiceSelect = (onSelect: (value: string) => void) => {
  const [isOpen, toggle] = useBoolean(false);

  useEscapeLayer({ kind: 'popover', active: isOpen, onEscape: () => toggle(false) });

  return {
    isOpen,
    toggle: () => toggle(),
    select: (value: string) => {
      toggle(false);
      onSelect(value);
    }
  };
};
