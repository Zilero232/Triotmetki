import { SECTION } from '@/entities/window/window-state';
import { Profiles } from '@/features/profile/manage-profiles';
import { AccountCard } from '@/widgets/account/account-card';
import { ComponentCard, ComponentEditor } from '@/widgets/component/component-card';
import { SearchPage, SectionCards, SectionPage } from '@/widgets/component/component-list';
import { HudEditor } from '@/widgets/hud/hud-editor';

import type { ContentProps } from './Content.types';

import { ReplaysPage } from '../ReplaysPage';
import { ToolPage } from '../ToolPage';

export const Content = ({ state, section, searching, editing, columns, compact, hasReplays }: ContentProps) => {
  if (editing) {
    return <ComponentEditor key={editing.id} compact={compact} component={editing} />;
  }

  if (searching) {
    return <SearchPage card={ComponentCard} columns={columns} />;
  }

  if (section === SECTION.profiles) {
    return (
      <ToolPage key={section} section={section}>
        <Profiles profiles={state.profiles} />
      </ToolPage>
    );
  }

  if (section === SECTION.hud) {
    return (
      <ToolPage key={section} section={section}>
        <HudEditor panels={state.hud.panels} />
        <SectionCards card={ComponentCard} columns={columns} section={section} />
      </ToolPage>
    );
  }

  if (section === SECTION.replays && hasReplays) {
    return <ReplaysPage key={section} />;
  }

  return <SectionPage key={section} card={ComponentCard} columns={columns} intro={section === SECTION.data && <AccountCard />} section={section} />;
};
