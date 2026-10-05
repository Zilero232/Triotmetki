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
    app_info: appInfo,
    list_clients: scenarioClients(scenario),
    get_catalog: catalog,
    get_installation: scenarioInstallation(scenario),
    list_profiles: profiles,
    get_settings: { ...settings, autostartAsked: true },
    get_patch_report: scenarioReport(scenario),
    check_now: scenarioReport(scenario),
    prepare_install: installPlan,
    install_modpack: installOutcome,
    get_gameface_status: gamefaceStatus,
    take_deep_link: null,
    get_conflicts: conflicts,
    list_sets: sets,
    scan_cache: cachePlan,
    get_account_link: accountLink,
    get_sync_status: syncStatus,
    get_whats_new: whatsNew,
    get_game_health: gameHealth
  };

  mockWindows('main');
  mockConvertFileSrc('windows');
  mockIPC((command) => responses[command] ?? null, { shouldMockEvents: true });
};
