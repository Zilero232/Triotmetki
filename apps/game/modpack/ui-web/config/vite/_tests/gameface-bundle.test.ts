import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, mergeConfig } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { advisorConfig } from '../advisor';
import { hudConfig } from '../hud';
import { settingsConfig } from '../settings';
import { viewerConfig } from '../viewer';
import { UI_BUILD } from '../vite.constants';

const BUNDLE_FILES = ['hud.html', 'icon.png', 'icons.png', 'index.html', 'preset_advisor.js', 'viewer.html'];
const CLASSIC_SCRIPT_AT_BODY_END = /<script>\(function\(\)\{[\s\S]*\}\)\(\);<\/script>\s*<\/body>\s*<\/html>\s*$/;
const POLYFILLED_ELEMENTS = /\.jsxs?\)\([`'"](?:ul|ol|li|dl|dt|dd|select|option)[`'"],/;

let outDir = '';

const read = (dir: string, file: string): Promise<string> => readFile(path.join(dir, file), 'utf8');

beforeAll(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), 'otmetki-ui-'));
  vi.stubEnv('NODE_ENV', 'production');

  for (const config of [settingsConfig(), hudConfig(), advisorConfig(), viewerConfig()]) {
    await build(mergeConfig(config, { configFile: false, logLevel: 'silent', build: { outDir } }));
  }
}, 60_000);

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(outDir, { recursive: true, force: true });
});

describe('committed Gameface bundle', () => {
  it('matches a fresh build of ui-web (run `bun run ui:build` in apps/game/modpack)', async () => {
    const files = (await readdir(outDir)).sort();

    expect(files).toEqual(BUNDLE_FILES);
    expect((await readdir(UI_BUILD.outDir)).sort()).toEqual(files);

    for (const file of files) {
      const [fresh, committed] = await Promise.all([readFile(path.join(outDir, file)), readFile(path.join(UI_BUILD.outDir, file))]);

      expect(fresh.equals(committed), file).toBe(true);
    }
  });

  it.each(['index.html', 'hud.html', 'viewer.html'])(
    'loads %s with one classic inline script at the end of the body, as the client pages do',
    async (file) => {
      const page = await read(outDir, file);

      expect(page).not.toContain('type="module"');
      expect(page.match(/<\/script>/g)).toHaveLength(1);
      expect(page).toMatch(CLASSIC_SCRIPT_AT_BODY_END);
    }
  );

  it('renders no list or select elements, which Gameface only supports through a polyfill', async () => {
    const files = await Promise.all(['index.html', 'hud.html', 'viewer.html'].map((file) => read(outDir, file)));

    files.forEach((source) => expect(source).not.toMatch(POLYFILLED_ELEMENTS));
  });

  it('ships the preset advisor script as one classic IIFE without React', async () => {
    const script = await read(outDir, 'preset_advisor.js');

    expect(script).not.toMatch(/^\s*(?:import|export)\s/m);
    expect(script).not.toContain('react.transitional.element');
  });
});
