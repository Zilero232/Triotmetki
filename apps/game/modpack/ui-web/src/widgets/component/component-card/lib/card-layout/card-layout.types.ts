import type { UiComponent, UiState } from '@/shared/api/protocol';

export type PreviewPanel = UiState['hud']['panels'][number];

export type PanelPreviewInput = {
  component: UiComponent;
  panels: UiState['hud']['panels'];
};
