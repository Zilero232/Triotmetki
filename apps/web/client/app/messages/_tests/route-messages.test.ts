import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createMessageUsage, declaredMessages, isCoveredBy } from '@/config/message-usage';

import { ROOT_MESSAGES } from '../config';

const CLIENT_ROOT = path.resolve(import.meta.dirname, '../../..');
const APP_ROOT = path.join(CLIENT_ROOT, 'app');
const ROUTE_FILE = /(?:page|layout|loading)\.tsx$/;

type Coverage = {
  required: readonly string[];
  provided: readonly string[];
};

const ROOT_ENTRIES = [
  'app/providers/AppProviders.tsx',
  'app/[locale]/layout.tsx',
  'app/[locale]/error.tsx',
  'app/[locale]/not-found.tsx',
  'app/[locale]/(site)/layout.tsx',
  'app/[locale]/(site)/error.tsx',
  'app/[locale]/(site)/not-found.tsx',
  'app/[locale]/(overlay)/layout.tsx',
  'app/[locale]/(overlay)/error.tsx',
  'app/[locale]/(tma)/error.tsx',
  'app/global-not-found.tsx'
];

const usage = createMessageUsage(CLIENT_ROOT);

const routeFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    return entry.isDirectory() ? routeFiles(full) : ROUTE_FILE.test(entry.name) ? [path.relative(CLIENT_ROOT, full).split(path.sep).join('/')] : [];
  });

const uncovered = ({ required, provided }: Coverage) => required.filter((key) => !isCoveredBy({ key, paths: provided }));

const unused = ({ required, provided }: Coverage) => provided.filter((key) => !required.some((need) => isCoveredBy({ key: need, paths: [key] })));

describe('route messages', () => {
  const rootRequired = usage({ entries: ROOT_ENTRIES });

  it('gives the root provider every message the layouts and boundaries render in the browser', () => {
    expect(uncovered({ required: rootRequired, provided: ROOT_MESSAGES })).toEqual([]);
  });

  it('keeps no root message nothing reads', () => {
    expect(unused({ required: rootRequired, provided: ROOT_MESSAGES })).toEqual([]);
  });

  it.each(routeFiles(APP_ROOT).filter((file) => !ROOT_ENTRIES.includes(file)))('%s declares the messages its client components read', (file) => {
    const declared = declaredMessages(fs.readFileSync(path.join(CLIENT_ROOT, file), 'utf8')) ?? [];
    const required = usage({ entries: [file] }).filter((key) => !isCoveredBy({ key, paths: ROOT_MESSAGES }));

    expect(uncovered({ required, provided: declared })).toEqual([]);
    expect(unused({ required, provided: declared })).toEqual([]);
  });
});
