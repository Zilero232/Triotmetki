import * as Y from 'yjs';
import * as z from 'zod';

import type { TacticLayer } from '@/entities/tactic/board';

import { zTacticBoard } from '@/entities/tactic/board';

import type { DeleteLayerInput, LayerIndicesInput, MergeByIdInput, WriteLayerInput } from './board-document.types';

import { BOARD, BOARD_SOCKET } from '../../config';

const layersSchema = zTacticBoard.shape.data.shape.layers;

const layerIdSchema = z.object({ id: z.string() });

const layerIdOf = (value: unknown): string | null => {
  const parsed = layerIdSchema.safeParse(value);

  return parsed.success ? parsed.data.id : null;
};

const mergeById = <T extends { id: string }>({ first, second }: MergeByIdInput<T>): T[] => {
  const merged = new Map<string, T>();

  for (const item of [...first, ...second]) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
};

const indicesOf = ({ array, layerId }: LayerIndicesInput) => array.toArray().flatMap((value, index) => (layerIdOf(value) === layerId ? [index] : []));

export const boardLayersOf = (doc: Y.Doc): Y.Array<unknown> => doc.getArray<unknown>(BOARD_SOCKET.layersKey);

export const readLayers = (array: Y.Array<unknown>): TacticLayer[] => {
  const layers = new Map<string, TacticLayer>();

  for (const value of array.toArray()) {
    const parsed = layersSchema.safeParse([value]);
    const [data] = parsed.success ? parsed.data : [];

    if (!data) {
      continue;
    }

    const existing = layers.get(data.id);

    layers.set(
      data.id,
      existing
        ? {
            ...data,
            strokes: mergeById({ first: existing.strokes, second: data.strokes }),
            icons: mergeById({ first: existing.icons, second: data.icons })
          }
        : data
    );
  }

  return [...layers.values()];
};

export const writeLayer = ({ doc, layer }: WriteLayerInput): void => {
  const array = boardLayersOf(doc);

  doc.transact(() => {
    const indices = indicesOf({ array, layerId: layer.id });
    const [first] = indices;

    if (first === undefined) {
      array.push([layer]);

      return;
    }

    for (const index of [...indices].reverse()) {
      array.delete(index, 1);
    }

    array.insert(first, [layer]);
  });
};

export const deleteLayer = ({ doc, layerId }: DeleteLayerInput): void => {
  const array = boardLayersOf(doc);

  doc.transact(() => {
    for (const index of indicesOf({ array, layerId }).reverse()) {
      array.delete(index, 1);
    }
  });
};

export const createBoardUndo = (doc: Y.Doc): Y.UndoManager => new Y.UndoManager(boardLayersOf(doc), { captureTimeout: BOARD.undoCaptureMs });
