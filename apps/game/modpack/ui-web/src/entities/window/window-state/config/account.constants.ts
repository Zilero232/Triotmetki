import type { StringKey } from '@/shared/i18n';
import type { UiIconName, UiIconTone } from '@/shared/lib/icon-sprite';

export const ACCOUNT_STATES: Record<'authFailed' | 'bound' | 'unbound', { icon: UiIconName; tone: UiIconTone; title: StringKey; hint: StringKey }> = {
  bound: { icon: 'circle-check', tone: 'success', title: 'accountBound', hint: 'accountBoundHint' },
  unbound: { icon: 'link', tone: 'accent', title: 'accountUnbound', hint: 'accountUnboundHint' },
  authFailed: { icon: 'triangle-alert', tone: 'danger', title: 'accountAuthFailed', hint: 'accountAuthFailedHint' }
};
