import { useBoolean } from '@siberiacancode/reactuse';

export const useAdvancedFields = (initiallyOpen: boolean) => {
  const [isOpen, toggle] = useBoolean(initiallyOpen);

  return { isOpen, toggle: () => toggle() };
};
