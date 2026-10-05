import type { UiComponent } from '@/shared/api/protocol';

export const listsBothContexts = (components: UiComponent[]): boolean =>
  components.some(({ context }) => context === 'hangar') && components.some(({ context }) => context === 'battle');
