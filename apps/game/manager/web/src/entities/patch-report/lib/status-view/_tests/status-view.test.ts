import reports from '@contract/patch-reports.json';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { patchReportSchema } from '@/entities/patch-report';

import { statusMessageValues, statusView } from '../status-view';

const statuses = z
  .array(patchReportSchema)
  .parse(reports)
  .map((report) => report.status);

describe('statusView', () => {
  it('offers the update only when a newer release is out', () => {
    const withUpdate = statuses.filter((status) => statusView({ status, needsMigration: false }).action === 'update');

    expect(withUpdate.map((status) => status.kind)).toEqual(['update_available', 'update_ready']);
  });

  it('offers the move itself when auto-migration is off and the installed release fits', () => {
    const ready = statuses.find((status) => status.kind === 'migration_ready');

    expect(ready && statusView({ status: ready, needsMigration: true }).action).toBe('migrate');
  });

  it('never offers an action while the game is running or the client is unsupported', () => {
    const blocked = statuses.filter((status) => status.kind === 'deferred' || status.kind === 'unsupported');

    expect(blocked.map((status) => statusView({ status, needsMigration: true }).action)).toEqual([null, null]);
  });

  it('offers to move the modpack when the client was patched and nothing moved it yet', () => {
    const waiting = statuses.find((status) => status.kind === 'waiting');

    expect(waiting && statusView({ status: waiting, needsMigration: true }).action).toBe('migrate');
  });

  it('shows failures in the danger tone', () => {
    const failed = statuses.filter((status) => statusView({ status, needsMigration: false }).tone === 'danger');

    expect(failed.map((status) => status.kind).toSorted()).toEqual(['failed', 'offline', 'unsupported']);
  });
});

describe('statusMessageValues', () => {
  const updated = statuses.find((status) => status.kind === 'update_available');
  const values = updated ? statusMessageValues({ status: updated, modpackVersion: null }) : {};

  it('keeps only text fields a message can interpolate', () => {
    expect(Object.values(values).every((value) => typeof value === 'string')).toBe(true);
  });

  it('leaves the release notes out of the message values', () => {
    expect(values).not.toHaveProperty('notes');
  });

  it('turns a missing modpack version into an empty string', () => {
    expect(values.version).toBe('');
  });
});
