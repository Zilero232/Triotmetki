import type { useSidebar } from './use-sidebar';

export type SidebarItemModel = ReturnType<typeof useSidebar>['components'][number];
