import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import type { ShowcaseItem } from '../../lib/showcase';

import { isBaseId } from '../../lib/showcase';
import { MOD_SHOWCASE } from '../mod-showcase.constants';

const CATALOG_PATH = path.resolve(import.meta.dirname, '../../../../../../game/modpack/catalog/catalog.json');

const catalogSchema = z.object({
  presets: z.array(z.object({ id: z.string() })),
  components: z.array(
    z.object({
      id: z.string(),
      kind: z.string().optional(),
      context: z.string().optional(),
      presets: z.array(z.string()).nullish()
    })
  )
});

const catalog = catalogSchema.parse(JSON.parse(readFileSync(CATALOG_PATH, 'utf8')));
const defaultPreset = catalog.presets[0]?.id;
const features = catalog.components.filter((component) => component.kind === undefined && !isBaseId(component.id));
const showcased = MOD_SHOWCASE.flatMap((group): readonly ShowcaseItem[] => group.items);

describe('MOD_SHOWCASE', () => {
  it('shows every component of the catalogue once', () => {
    expect(showcased.map((item) => item.id).sort()).toEqual(features.map((component) => component.id).sort());
  });

  it('keeps the context of each component from the catalogue', () => {
    showcased.forEach((item) => {
      expect({ id: item.id, context: item.context }).toEqual({ id: item.id, context: features.find(({ id }) => id === item.id)?.context });
    });
  });

  it('marks as default exactly the components of the first preset', () => {
    showcased.forEach((item) => {
      const presets = features.find(({ id }) => id === item.id)?.presets ?? [];

      expect({ id: item.id, isDefault: item.isDefault }).toEqual({ id: item.id, isDefault: presets.includes(defaultPreset ?? '') });
    });
  });
});
