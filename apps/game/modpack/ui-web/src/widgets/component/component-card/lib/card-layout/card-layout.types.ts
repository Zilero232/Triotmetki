import type { UiComponent, UiField, UiState } from '@/shared/api/protocol';
import type { UiIconName } from '@/shared/lib/icon-sprite';

export type CardLayoutInput = {
  component: UiComponent;
  fields: UiField[] | undefined;
  isExpanded: boolean;
  forceOpen: boolean;
};

export type CardLayout = {
  fields: UiField[];
  advanced: UiField[];
  expandable: boolean;
  open: boolean;
  showEmpty: boolean;
  chevron: UiIconName;
};

export type ChevronInput = {
  hasEditor: boolean;
  open: boolean;
};

export type PreviewPanel = UiState['hud']['panels'][number];

export type PanelPreviewInput = {
  component: UiComponent;
  panels: UiState['hud']['panels'];
};
