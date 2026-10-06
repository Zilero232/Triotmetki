export type SpriteCell = { column: number; row: number };

export type SpriteGrid = { columns: number; rows: number };

export type SpriteCellStyleInput = {
  file: string;
  cell: SpriteCell;
  grid: SpriteGrid;
  width: number;
  height: number;
};

export type SpriteCellStyle = {
  width: string;
  height: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
};
