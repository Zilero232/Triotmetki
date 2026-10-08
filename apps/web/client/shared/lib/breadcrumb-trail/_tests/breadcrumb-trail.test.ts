import { describe, expect, it } from 'vitest';

import { breadcrumbCrumbs, breadcrumbTrail, withHomeCrumb } from '@/shared/lib';

const HOME = { label: 'Главная', href: '/' };

describe('breadcrumbTrail', () => {
  it('keeps linked crumbs and the current one', () => {
    expect(breadcrumbTrail([{ label: 'Танки', href: '/tanks' }, { label: 'СССР' }, { label: 'ИС-7' }])).toEqual([
      { name: 'Танки', path: '/tanks' },
      { name: 'ИС-7', path: undefined }
    ]);
  });

  it('skips a trail with a rich label or a single crumb', () => {
    expect(breadcrumbTrail([{ label: 'Танки', href: '/tanks' }, { label: null }])).toBeNull();
    expect(breadcrumbTrail([{ label: 'Танки' }])).toBeNull();
  });
});

describe('breadcrumbCrumbs', () => {
  it('marks only the last crumb as current', () => {
    expect(breadcrumbCrumbs([{ label: 'Танки', href: '/tanks' }, { label: 'СССР' }, { label: 'ИС-7' }]).map(({ isCurrent }) => isCurrent)).toEqual([
      false,
      false,
      true
    ]);
  });

  it('gives every crumb a distinct key, even without a link', () => {
    const keys = breadcrumbCrumbs([{ label: 'Танки', href: '/tanks' }, { label: 'СССР' }, { label: 'ИС-7' }]).map(({ key }) => key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('withHomeCrumb', () => {
  it('puts the home crumb in front of a section trail', () => {
    const trail = withHomeCrumb({ items: [{ label: 'Танки', href: '/tanks' }, { label: 'ИС-7' }], home: HOME });

    expect(trail[0]).toEqual(HOME);
  });

  it('adds the home crumb only once when the trail already starts at home', () => {
    const trail = withHomeCrumb({ items: [HOME, { label: 'Гайды' }], home: HOME });

    expect(trail).toHaveLength(2);
  });
});
