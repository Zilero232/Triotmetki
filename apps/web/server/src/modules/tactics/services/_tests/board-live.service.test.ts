import { Document, Hocuspocus } from '@hocuspocus/server';
import { describe, expect, it, vi } from 'vitest';

import type { CollabContext, TacticBoardData } from '../../tactics.types';

import { BOARD_DOCUMENT, TACTICS } from '../../config/tactics.constants';
import { BoardLiveService } from '../board-live.service';

const BOARD_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NAME = `${TACTICS.documentPrefix}${BOARD_ID}`;

const layer = (id: string) => ({ id, name: id, visible: true, strokes: [], icons: [] });
const data: TacticBoardData = { layers: [layer('new')] };

const createLive = () => {
  const hocuspocus = new Hocuspocus<CollabContext>({ quiet: true });
  const live = new BoardLiveService();

  live.attach(hocuspocus);

  return { hocuspocus, live };
};

const openDocument = (hocuspocus: Hocuspocus<CollabContext>, isLoading = false) => {
  const document = new Document(NAME);

  document.isLoading = isLoading;
  document.getArray<unknown>(BOARD_DOCUMENT.layersKey).push([layer('old')]);
  hocuspocus.documents.set(NAME, document);

  return document;
};

describe('BoardLiveService.replaceData', () => {
  it('reports false before a collaboration server is attached', () => {
    expect(new BoardLiveService().replaceData({ id: BOARD_ID, data })).toBe(false);
  });

  it('reports false when nobody has the board open', () => {
    const { live } = createLive();

    expect(live.replaceData({ id: BOARD_ID, data })).toBe(false);
  });

  it('leaves a document that is still loading alone', () => {
    const { hocuspocus, live } = createLive();
    const document = openDocument(hocuspocus, true);

    expect(live.replaceData({ id: BOARD_ID, data })).toBe(false);
    expect(document.getArray(BOARD_DOCUMENT.layersKey).toJSON()).toEqual([layer('old')]);
  });

  it('replaces the layers of an open board for everyone connected', () => {
    const { hocuspocus, live } = createLive();
    const document = openDocument(hocuspocus);

    expect(live.replaceData({ id: BOARD_ID, data })).toBe(true);
    expect(document.getArray(BOARD_DOCUMENT.layersKey).toJSON()).toEqual(data.layers);
  });
});

describe('BoardLiveService.close', () => {
  it('closes only the connections of that board', () => {
    const { hocuspocus, live } = createLive();
    const closeConnections = vi.spyOn(hocuspocus, 'closeConnections');

    live.close(BOARD_ID);

    expect(closeConnections).toHaveBeenCalledWith(NAME);
  });

  it('does nothing before a collaboration server is attached', () => {
    expect(() => new BoardLiveService().close(BOARD_ID)).not.toThrow();
  });
});
