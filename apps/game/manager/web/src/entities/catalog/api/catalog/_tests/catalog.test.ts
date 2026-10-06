import catalog from '@contract/catalog.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';

describe('catalogSchema', () => {
  it('parses the components.json the Rust core serves', () => {
    const parsed = catalogSchema.parse(catalog);

    expect(parsed.components.length).toBeGreaterThan(0);
    expect(parsed.components.every((component) => parsed.categories.some((category) => category.id === component.category))).toBe(true);
  });

  it('keeps the runtime dependencies apart from our components, with their licence and pinned source', () => {
    const parsed = catalogSchema.parse(catalog);

    expect(parsed.dependencies.map((dependency) => dependency.id)).toEqual(['openwg_gameface', 'modslist']);
    expect(parsed.dependencies.every((dependency) => dependency.licence.name === 'MIT' && dependency.sha256.length === 64)).toBe(true);
    expect(parsed.components.some((component) => component.id === 'modslist')).toBe(false);
  });

  it('treats a dependency without the optional flag as required', () => {
    const [gameface] = catalog.dependencies;
    const { optional, ...legacy } = gameface;
    const parsed = catalogSchema.parse({ ...catalog, dependencies: [legacy, { ...gameface, id: 'modslist', optional: true }] });

    expect(optional).toBe(false);
    expect(parsed.dependencies.map((dependency) => dependency.optional)).toEqual([false, true]);
  });
});
