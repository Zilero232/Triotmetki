import type { CellRect, CellRectInput, ClearCellsInput, DrawCellsInput, PaintCellInput } from './draw-cells.types';

import { ARMOR_MAP } from '../../config';
import { decodeCell, hatchColor, isHatched, toneColor } from '../cell-code';

export const cellRect = ({ map, size, index }: CellRectInput): CellRect => {
  const col = index % map.cols;
  const row = Math.floor(index / map.cols);
  const width = (map.width * size.width) / map.cols;
  const height = (map.height * size.height) / map.rows;
  const left = Math.floor(map.left * size.width + col * width);
  const top = Math.floor(map.top * size.height + row * height);

  return { x: left, y: top, width: Math.ceil(width), height: Math.ceil(height) };
};

const paintCell = ({ painter, map, rect, index }: PaintCellInput): boolean => {
  const { tone, pattern } = decodeCell(map.cells.charAt(index));
  const color = toneColor({ tone, mode: map.mode });

  if (tone === ARMOR_MAP.empty || color === null) {
    return false;
  }

  painter.fillStyle = color;
  painter.fillRect(rect.x, rect.y, rect.width, rect.height);

  const hatch = hatchColor(pattern);
  const position = { col: index % map.cols, row: Math.floor(index / map.cols), pattern };

  if (hatch !== null && isHatched(position)) {
    painter.fillStyle = hatch;
    painter.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  return true;
};

export const drawCells = ({ painter, map, size }: DrawCellsInput): number => {
  painter.clearRect(0, 0, size.width, size.height);
  painter.globalAlpha = map.opacity;

  const count = Math.min(map.cells.length, map.cols * map.rows);
  let painted = 0;

  for (let index = 0; index < count; index += 1) {
    if (paintCell({ painter, map, rect: cellRect({ map, size, index }), index })) {
      painted += 1;
    }
  }

  painter.globalAlpha = 1;

  return painted;
};

export const clearCells = ({ painter, size }: ClearCellsInput): void => {
  painter.clearRect(0, 0, size.width, size.height);
};
