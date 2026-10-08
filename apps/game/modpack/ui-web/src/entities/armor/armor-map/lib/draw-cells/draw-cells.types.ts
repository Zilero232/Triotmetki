import type { ArmorMapData } from '../../model/schemas';

export type CanvasPainter = Pick<CanvasRenderingContext2D, 'clearRect' | 'fillRect' | 'fillStyle' | 'globalAlpha'>;

export type CanvasSize = { width: number; height: number };

export type DrawCellsInput = { painter: CanvasPainter; map: ArmorMapData; size: CanvasSize };

export type ClearCellsInput = { painter: Pick<CanvasPainter, 'clearRect'>; size: CanvasSize };

export type CellRect = { x: number; y: number; width: number; height: number };

export type CellRectInput = { map: ArmorMapData; size: CanvasSize; index: number };

export type PaintCellInput = { painter: CanvasPainter; map: ArmorMapData; rect: CellRect; index: number };
