import type { Installation } from '@/entities/installation';

export const enabledComponents = (installation: Pick<Installation, 'components'> | undefined): string[] =>
  installation?.components.filter((component) => component.state === 'enabled').map((component) => component.id) ?? [];
