import accountLink from '@contract/account-link.json';
import appInfo from '@contract/app-info.json';
import cachePlan from '@contract/cache-plan.json';
import catalog from '@contract/catalog.json';
import clients from '@contract/clients.json';
import conflicts from '@contract/conflicts.json';
import gameHealth from '@contract/game-health.json';
import gamefaceStatus from '@contract/gameface-status.json';
import installOutcome from '@contract/install-outcome.json';
import installPlan from '@contract/install-plan.json';
import installation from '@contract/installation.json';
import patchReports from '@contract/patch-reports.json';
import profiles from '@contract/profiles.json';
import sets from '@contract/sets.json';
import settings from '@contract/settings.json';
import syncStatus from '@contract/sync-status.json';
import whatsNew from '@contract/whats-new.json';
import { mockConvertFileSrc, mockIPC, mockWindows } from '@tauri-apps/api/mocks';

import { COMMANDS } from '@/shared/config';

import type { DevIpcScenario } from './dev-ipc.types';

import { DEV_IPC } from '../../config';

const scenarioFromUrl = (): DevIpcScenario => {
  const value = new URLSearchParams(window.location.search).get(DEV_IPC.queryFlag);

  return DEV_IPC.scenarios.find((scenario) => scenario === value) ?? DEV_IPC.defaultScenario;
};

const scenarioInstallation = (scenario: DevIpcScenario) => {
  if (scenario === 'fresh' || scenario === 'no-game') {
    return { ...installation, installed: false, modpackVersion: null, installedAt: null, manifestGameVersion: null, components: [] };
  }

  return { ...installation, needsMigration: scenario === 'migrate' };
};

const scenarioClients = (scenario: DevIpcScenario) => (scenario === 'no-game' ? { clients: [], selected: null } : clients);

const scenarioReport = (scenario: DevIpcScenario) =>
  patchReports.find((report) => report.status.kind === DEV_IPC.statusByScenario[scenario]) ?? patchReports[0];

const isRequested = () => !('__TAURI_INTERNALS__' in window) && new URLSearchParams(window.location.search).has(DEV_IPC.queryFlag);

export const installDevIpcOnRequest = () => {
  if (!isRequested()) {
    return;
  }

  const scenario = scenarioFromUrl();
  const responses: Record<string, unknown> = {
    [COMMANDS.appInfo]: appInfo,
    [COMMANDS.listClients]: scenarioClients(scenario),
    [COMMANDS.getCatalog]: catalog,
    [COMMANDS.getInstallation]: scenarioInstallation(scenario),
    [COMMANDS.listProfiles]: profiles,
    [COMMANDS.getSettings]: { ...settings, autostartAsked: true },
    [COMMANDS.getPatchReport]: scenarioReport(scenario),
    [COMMANDS.checkNow]: scenarioReport(scenario),
    [COMMANDS.prepareInstall]: installPlan,
    [COMMANDS.installModpack]: installOutcome,
    [COMMANDS.getGamefaceStatus]: gamefaceStatus,
    [COMMANDS.takeDeepLink]: null,
    [COMMANDS.getConflicts]: conflicts,
    [COMMANDS.listSets]: sets,
    [COMMANDS.scanCache]: cachePlan,
    [COMMANDS.getAccountLink]: accountLink,
    [COMMANDS.getSyncStatus]: syncStatus,
    [COMMANDS.getWhatsNew]: whatsNew,
    [COMMANDS.getGameHealth]: gameHealth
  };

  mockWindows('main');
  mockConvertFileSrc('windows');
  mockIPC((command) => responses[command] ?? null, { shouldMockEvents: true });
};
