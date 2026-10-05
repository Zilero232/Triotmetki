import replaysPage from '@/entities/replay/replay/_tests/fixtures/replays-page.sample.json';
import { createDevGameface, relayEscape } from '@/shared/api/gameface/dev-bridge';
import { installGamefaceMock } from '@/shared/api/gameface/mock';

const mock = createDevGameface({ replaysPage });

installGamefaceMock(mock);
relayEscape(mock);
