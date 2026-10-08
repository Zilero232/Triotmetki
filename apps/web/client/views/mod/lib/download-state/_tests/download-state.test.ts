import { describe, expect, it } from 'vitest';

import { downloadState } from '../download-state';

const LOADING = { isPending: true, isError: false, isPublished: false, hasManager: false } as const;

describe('downloadState', () => {
  it('offers the manager link when the release status could not be loaded', () => {
    expect(downloadState({ ...LOADING, isPending: false, isError: true }).isAvailable).toBe(true);
  });

  it('does not claim the release is being prepared when the status failed', () => {
    expect(downloadState({ ...LOADING, isPending: false, isError: true }).isPreparing).toBe(false);
  });

  it('says the release is being prepared after an empty answer', () => {
    expect(downloadState({ ...LOADING, isPending: false }).isPreparing).toBe(true);
  });

  it('keeps the link disabled after an empty answer', () => {
    expect(downloadState({ ...LOADING, isPending: false }).isAvailable).toBe(false);
  });

  it('stays quiet while the status loads', () => {
    expect(downloadState(LOADING).isPreparing).toBe(false);
  });

  it('offers a published manager', () => {
    expect(downloadState({ isPending: false, isError: false, isPublished: true, hasManager: true }).isAvailable).toBe(true);
  });
});
