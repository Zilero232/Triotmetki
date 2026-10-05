import { match, P } from 'ts-pattern';

import type { ParsedNotification } from '../../config/notifications-queue.types';
import type {
  AccountNotification,
  CommunityNotification,
  LinkInput,
  NotificationLocale,
  NotificationMessage,
  NotificationTextInput,
  PlayerNotification,
  RenderDigestInput,
  RenderedNotification,
  RenderNotificationInput,
  TankNotification
} from './notification-copy.types';

import { winRatePercent } from '../../../../common/lib';
import { createFluentStore } from '../../../telegram';
import { NOTIFICATION_COPY, NOTIFICATION_GROUPS, NOTIFICATION_LINKS } from '../../config/copy.constants';

const store = createFluentStore({ files: NOTIFICATION_COPY.files });

const link = ({ webUrl, path }: LinkInput): string => new URL(path, webUrl).href;

const playerPath = (nickname: string): string => `${NOTIFICATION_LINKS.player}/${encodeURIComponent(nickname)}`;

const clanWorkspacePath = (clanId: number): string => `${NOTIFICATION_LINKS.clans}/${clanId}/${NOTIFICATION_LINKS.clanWorkspace}`;

export const resolveNotificationLocale = (raw: string | null | undefined): NotificationLocale =>
  NOTIFICATION_COPY.locales.find((locale) => raw?.toLowerCase().startsWith(locale)) ?? NOTIFICATION_COPY.fallbackLocale;

export const notificationText = ({ locale, key, values }: NotificationTextInput): string => store.t(locale, key, values);

const tankMessage = (notification: TankNotification): NotificationMessage =>
  match(notification)
    .with({ event: 'moeGained' }, (event) => ({
      message: event.isFollowed ? 'moe-gained-followed' : 'moe-gained',
      values: { nickname: event.nickname, marks: event.marks, tankName: event.tankName },
      path: playerPath(event.nickname)
    }))
    .with({ event: 'moeThresholdDropped' }, (event) => ({
      message: 'moe-threshold-dropped',
      values: { tankName: event.tankName, mark: event.mark, from: event.from, to: event.to },
      path: `${NOTIFICATION_LINKS.tank}/${event.tankId}`
    }))
    .with({ event: 'premiumOffer' }, (event) => ({
      message: 'premium-offer',
      values: { tankName: event.tankName, discount: event.discountPercent ?? NOTIFICATION_COPY.missing },
      path: `${NOTIFICATION_LINKS.tank}/${event.tankId}`
    }))
    .with({ event: 'tankReturned' }, (event) => ({
      message: 'tank-returned',
      values: {
        tankName: event.tankName,
        absentDays: event.absentDays ?? NOTIFICATION_COPY.missing,
        discount: event.discountPercent ?? NOTIFICATION_COPY.missing
      },
      path: `${NOTIFICATION_LINKS.tank}/${event.tankId}`
    }))
    .with({ event: 'tankLevelUp' }, (event) => ({
      message: 'tank-level-up',
      values: { tankName: event.tankName, level: event.level, shells: event.shells },
      path: NOTIFICATION_LINKS.progress
    }))
    .with({ event: 'tankChallengeDone' }, (event) => ({
      message: 'tank-challenge-done',
      values: { tankName: event.tankName, shells: event.shells },
      path: NOTIFICATION_LINKS.progress
    }))
    .exhaustive();

const playerMessage = (notification: PlayerNotification): NotificationMessage =>
  match(notification)
    .with({ event: 'sessionFinished' }, (event) => ({
      message: 'session-finished',
      values: {
        nickname: event.nickname,
        battles: event.battles,
        winRate: event.winRate * 100,
        avgDamage: event.avgDamage,
        wn8: event.wn8 ?? NOTIFICATION_COPY.missing
      },
      path: `${playerPath(event.nickname)}?${new URLSearchParams({ [NOTIFICATION_LINKS.sessionParam]: event.sessionId }).toString()}`
    }))
    .with({ event: 'firstWinAvailable' }, (event) => ({
      message: 'first-win-available',
      values: { nickname: event.nickname, available: event.available },
      path: NOTIFICATION_LINKS.analytics
    }))
    .with({ event: 'watchlistDigest' }, (event) => ({
      message: 'watchlist-digest',
      values: {
        players: event.activePlayers,
        battles: event.battles,
        marks: event.marksGained,
        leader: event.top[0]?.nickname ?? NOTIFICATION_COPY.missing,
        leaderBattles: event.top[0]?.battles ?? 0,
        leaderWinRate: event.top[0]?.winRate ?? 0
      },
      path: NOTIFICATION_LINKS.watchlist
    }))
    .with({ event: 'goalReached' }, (event) => ({
      message: 'goal-reached',
      values: { metric: event.metric, target: event.target },
      path: NOTIFICATION_LINKS.goals
    }))
    .with({ event: 'badgeAwarded' }, (event) => ({
      message: 'badge-awarded',
      values: { title: event.title },
      path: NOTIFICATION_LINKS.badges
    }))
    .exhaustive();

const communityMessage = (notification: CommunityNotification): NotificationMessage =>
  match(notification)
    .with({ event: 'challengeResolved' }, (event) => ({
      message: 'challenge-resolved',
      values: { title: event.title, outcome: event.isSucceeded ? 'succeeded' : 'failed' },
      path: NOTIFICATION_LINKS.challenges
    }))
    .with({ event: 'clanEventReminder' }, (event) => ({
      message: 'clan-event-reminder',
      values: { clanTag: event.clanTag, title: event.title, startsAt: event.startsAt ?? NOTIFICATION_COPY.missing },
      path: clanWorkspacePath(event.clanId)
    }))
    .with({ event: 'clanWeeklyReport' }, (event) => ({
      message: 'clan-weekly-report',
      values: {
        clanTag: event.clanTag,
        events: event.report.events,
        attendance: event.report.attendanceRate === null ? NOTIFICATION_COPY.missing : event.report.attendanceRate * 100,
        newCandidates: event.report.newCandidates,
        inactiveMembers: event.report.inactiveMembers
      },
      path: clanWorkspacePath(event.clanId)
    }))
    .with({ event: 'streamerLive' }, (event) => ({
      message: event.tankName ? 'streamer-live-tank' : 'streamer-live',
      values: { name: event.displayName, platform: event.platform, tankName: event.tankName ?? NOTIFICATION_COPY.missing },
      path: `${NOTIFICATION_LINKS.streamer}/${encodeURIComponent(event.slug)}`
    }))
    .with({ event: 'competitionFinished' }, (event) => ({
      message: 'competition-finished',
      values: { title: event.title, teamName: event.teamName, rank: event.rank, teams: event.teams },
      path: `${NOTIFICATION_LINKS.competitions}/${encodeURIComponent(event.competitionSlug)}`
    }))
    .exhaustive();

const accountMessage = (notification: AccountNotification): NotificationMessage =>
  match(notification)
    .with({ event: 'bonusCode' }, (event) => ({
      message: 'bonus-code',
      values: { code: event.code, description: event.description || NOTIFICATION_COPY.missing },
      path: NOTIFICATION_LINKS.bonusCodes
    }))
    .with({ event: 'replayOverflow' }, (event) => ({
      message: 'replay-overflow',
      values: { stored: event.stored, keep: event.keep, daysLeft: event.daysLeft, deleteAt: event.deleteAt },
      path: NOTIFICATION_LINKS.replays
    }))
    .with({ event: 'plusCheckoutOpen' }, () => ({ message: 'plus-checkout-open', values: {}, path: NOTIFICATION_LINKS.plus }))
    .with({ event: 'lestaRelinkRequired' }, (event) => ({
      message: 'lesta-relink-required',
      values: { nickname: event.nickname },
      path: NOTIFICATION_LINKS.linkedAccounts
    }))
    .exhaustive();

const messageOf = (notification: ParsedNotification): NotificationMessage =>
  match(notification)
    .with({ event: P.union(...NOTIFICATION_GROUPS.tank) }, tankMessage)
    .with({ event: P.union(...NOTIFICATION_GROUPS.player) }, playerMessage)
    .with({ event: P.union(...NOTIFICATION_GROUPS.community) }, communityMessage)
    .with({ event: P.union(...NOTIFICATION_GROUPS.account) }, accountMessage)
    .exhaustive();

export const renderNotification = ({ notification, locale, webUrl }: RenderNotificationInput): RenderedNotification => {
  const { message, values, path } = messageOf(notification);

  return {
    title: notificationText({ locale, key: `${message}-title`, values }),
    body: notificationText({ locale, key: `${message}-body`, values }),
    url: link({ webUrl, path })
  };
};

export const renderDigest = ({ digest, locale, webUrl }: RenderDigestInput): RenderedNotification => {
  const title = notificationText({ locale, key: 'digest-title' });
  const url = link({ webUrl, path: NOTIFICATION_LINKS.digest });

  const winRate = winRatePercent({ wins: digest.wins, battles: digest.battles });

  if (winRate === null) {
    return { title, body: notificationText({ locale, key: 'digest-empty' }), url };
  }

  return {
    title,
    body: notificationText({
      locale,
      key: 'digest-body',
      values: {
        battles: digest.battles,
        sessions: digest.sessions,
        winRate,
        avgDamage: digest.damageDealt / digest.battles,
        marksGained: digest.marksGained
      }
    }),
    url
  };
};
