import { withMessages } from '@/app/messages';
import { PlayerProfileFallback } from '@/views/player-profile';

const Loading = () => <PlayerProfileFallback />;

export default withMessages({ component: Loading, messages: ['cosmetics', 'marks.progress', 'periods', 'profile', 'watchlist.button'] });
