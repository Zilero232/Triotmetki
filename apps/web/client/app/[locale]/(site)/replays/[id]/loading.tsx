import { withMessages } from '@/app/messages';
import { PageHeaderFallback } from '@/ui-kit';
import { ReplaySkeleton } from '@/views/replay';

const Loading = () => (
  <PageHeaderFallback hasDescription={false}>
    <ReplaySkeleton />
  </PageHeaderFallback>
);

export default withMessages({ component: Loading, messages: ['maps', 'modes.all', 'modes.replay', 'replays', 'tanks.picker'] });
