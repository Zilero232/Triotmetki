import { describe, expect, it } from 'vitest';

import { navMarker } from '../nav-marker';

describe('navMarker', () => {
  it('marks home when the update check failed or the client is unsupported', () => {
    expect(navMarker({ section: 'home', statusKind: 'failed', failureCount: 0 })).toEqual({ kind: 'problem', count: null });
  });

  it('leaves home unmarked for states the status dock already shows', () => {
    expect(navMarker({ section: 'home', statusKind: 'update_available', failureCount: 0 })).toBeNull();
  });

  it('leaves home unmarked while offline, since nothing can be fixed from the manager', () => {
    expect(navMarker({ section: 'home', statusKind: 'offline', failureCount: 0 })).toBeNull();
  });

  it('counts the components that failed to load on the components section', () => {
    expect(navMarker({ section: 'components', statusKind: null, failureCount: 2 })).toEqual({ kind: 'failures', count: 2 });
  });

  it('leaves the other sections unmarked', () => {
    expect(navMarker({ section: 'profiles', statusKind: 'failed', failureCount: 3 })).toBeNull();
  });
});
