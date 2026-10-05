import type { Section } from '@/entities/window/window-state';
import type { UiComponent, UiState } from '@/shared/api/protocol';

export type ContentProps = {
  state: UiState;
  section: Section;
  searching: boolean;
  editing: UiComponent | null;
  columns: number;
};
