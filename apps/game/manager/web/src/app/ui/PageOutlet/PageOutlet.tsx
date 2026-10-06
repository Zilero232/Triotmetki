import { useNavigation } from '@/shared/lib';
import { AboutView } from '@/views/about';
import { AccountView } from '@/views/account';
import { ComponentsView } from '@/views/components';
import { HelpView } from '@/views/help';
import { HomeView } from '@/views/home';
import { InstallView } from '@/views/install';
import { MaintenanceView } from '@/views/maintenance';
import { ProfilesView } from '@/views/profiles';
import { SettingsView } from '@/views/settings';
import { UpdatesView } from '@/views/updates';
import { AppShell } from '@/widgets/app-shell';

import { useAppSync } from '../../model/hooks';

const VIEWS = {
  home: HomeView,
  install: InstallView,
  components: ComponentsView,
  profiles: ProfilesView,
  updates: UpdatesView,
  maintenance: MaintenanceView,
  account: AccountView,
  settings: SettingsView,
  help: HelpView,
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
