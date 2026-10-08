import { withMessages } from '@/app/messages';
import { TanksPageFallback } from '@/views/tanks';

const Loading = () => <TanksPageFallback />;

export default withMessages({ component: Loading, messages: ['periods', 'plus', 'status.label', 'tanks'] });
