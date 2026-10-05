import { useNavigation } from '@/shared/lib';
import { AboutView } from '@/views/about';
import { AccountView } from '@/views/account';
import { ChangelogView } from '@/views/changelog';
import { ComponentsView } from '@/views/components';
import { HelpView } from '@/views/help';
import { HomeView } from '@/views/home';
import { InstallView } from '@/views/install';
import { ProfilesView } from '@/views/profiles';
import { SetsView } from '@/views/sets';
import { SettingsView } from '@/views/settings';
import { AppShell } from '@/widgets/app-shell';

import { useAppSync } from '../../model/hooks';

const VIEWS = {
  home: HomeView,
  install: InstallView,
  components: ComponentsView,
  sets: SetsView,
  profiles: ProfilesView,
  settings: SettingsView,
  account: AccountView,
  help: HelpView,
  changelog: ChangelogView,
  about: AboutView
};

export const PageOutlet = () => {
  const { page } = useNavigation();
  const View = VIEWS[page];

  useAppSync();

  return (
    <AppShell>
      <View />
    </AppShell>
  );
};
