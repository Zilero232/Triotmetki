import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { ParsedNotification } from '../../../config/notifications-queue.types';

import { NOTIFICATION_COPY } from '../../../config/copy.constants';
import { notificationText, renderDigest, renderNotification, resolveNotificationLocale } from '../notification-copy';

const webUrl = 'https://triotmetki.ru';

const moeGained: ParsedNotification = {
  event: 'moeGained',
  accountId: 1,
  nickname: 'Tanker',
  tankId: 1,
  tankName: 'Об. 140',
  marks: 3,
  isFollowed: false
};

const session: ParsedNotification = {
  event: 'sessionFinished',
  accountId: 1,
  nickname: 'Tanker',
  sessionId: 's',
  battles: 10,
  winRate: 0.6,
  avgDamage: 2500,
  wn8: null
};

const samples: ParsedNotification[] = [
  moeGained,
  { event: 'moeThresholdDropped', tankId: 1, tankName: 'Об. 140', mark: 3, from: 4100, to: 4000 },
  session,
  { event: 'bonusCode', code: 'TANKS2026', description: null },
  { event: 'premiumOffer', tankId: 1, tankName: 'Об. 140', discountPercent: 30 },
  { event: 'challengeResolved', challengeId: 'c', title: '3000 on LT', isSucceeded: true },
  { event: 'clanEventReminder', clanId: 1, clanTag: 'BRNV', title: 'Stronghold', startsAt: '2026-09-25T18:00:00.000Z' },
  {
    event: 'clanWeeklyReport',
    clanId: 1,
    clanTag: 'BRNV',
    from: '2026-09-18T00:00:00.000Z',
    report: { events: 3, attendanceRate: null, newCandidates: 1, inactiveMembers: 2 }
  },
  { event: 'badgeAwarded', accountId: 1, badgeCode: 'b', title: 'Veteran' },
  { event: 'replayOverflow', stored: 120, keep: 50, daysLeft: 14, deleteAt: '2027-03-01' },
  {
    event: 'watchlistDigest',
    activePlayers: 2,
    battles: 31,
    marksGained: 1,
    top: [{ nickname: 'Tanker', battles: 20, winRate: 55.5, marksGained: 1 }]
  },
  { event: 'watchlistDigest', activePlayers: 1, battles: 0, marksGained: 1, top: [] },
  { event: 'tankReturned', tankId: 1, tankName: 'Об. 140', absentDays: 120, discountPercent: null },
  { event: 'tankReturned', tankId: 1, tankName: 'Об. 140', absentDays: null, discountPercent: 20 },
  { event: 'competitionFinished', competitionSlug: 'cup-1', title: 'Cup', teamName: 'Alpha', rank: 2, teams: 8 },
  { event: 'tankLevelUp', tankId: 1, tankName: 'Об. 140', level: 5, shells: 20 },
  { event: 'tankChallengeDone', tankId: 1, tankName: 'Об. 140', shells: 15 },
  { event: 'goalReached', goalId: 'g', metric: 'avgDamage', target: 3000 },
  { event: 'goalReached', goalId: 'g', metric: 'broneIndex', target: 1500.5 },
  { event: 'plusCheckoutOpen' },
  { event: 'lestaRelinkRequired', accountId: 1, nickname: 'Tanker' }
];

const messageIds = (locale: (typeof NOTIFICATION_COPY.locales)[number]) =>
  readFileSync(NOTIFICATION_COPY.files[locale], 'utf8')
    .split(/\r?\n/u)
    .flatMap((line) => /^([a-z][\w-]*)\s*=/u.exec(line)?.[1] ?? [])
    .sort();

const digit = (value: number, locale: string) => new Intl.NumberFormat(locale).format(value);

describe('notification locales', () => {
  it('define the same messages in every language', () => {
    const [first, ...rest] = NOTIFICATION_COPY.locales;

    for (const locale of rest) {
      expect(messageIds(locale)).toEqual(messageIds(first));
    }
  });
});

describe('resolveNotificationLocale', () => {
  it('maps a region tag onto a supported locale and defaults to the fallback', () => {
    expect(resolveNotificationLocale('en-US')).toBe('en');
    expect(resolveNotificationLocale(null)).toBe(NOTIFICATION_COPY.fallbackLocale);
    expect(resolveNotificationLocale('de')).toBe(NOTIFICATION_COPY.fallbackLocale);
  });
});

describe('renderNotification', () => {
  it.each(NOTIFICATION_COPY.locales)('leaves no message or variable unresolved in %s', (locale) => {
    for (const notification of samples) {
      const rendered = renderNotification({ notification, locale, webUrl });

      expect(rendered.body).not.toMatch(/\{[\w$-]+\}/u);
      expect(rendered.title).not.toMatch(/\{[\w$-]+\}/u);
      expect(rendered.body).not.toContain(NOTIFICATION_COPY.missing);
      expect(rendered.title.length).toBeGreaterThan(0);
      expect(rendered.url.startsWith(webUrl)).toBe(true);
    }
  });

  it('uses the friend wording for a followed player', () => {
    const own = renderNotification({ notification: moeGained, locale: 'en', webUrl });
    const followed = renderNotification({ notification: { ...moeGained, isFollowed: true }, locale: 'en', webUrl });

    expect(followed.title).toBe(notificationText({ locale: 'en', key: 'moe-gained-followed-title' }));
    expect(own.title).toBe(notificationText({ locale: 'en', key: 'moe-gained-title' }));
  });

  it('shows the missing mark for an absent WN8 instead of "null"', () => {
    const rendered = renderNotification({ notification: session, locale: 'ru', webUrl });

    expect(rendered.body).toContain(notificationText({ locale: 'ru', key: 'missing' }));
    expect(rendered.body).not.toContain('null');
  });

  it('names the goal metric and target of a reached goal', () => {
    const rendered = renderNotification({ notification: { event: 'goalReached', goalId: 'g', metric: 'winRate', target: 55 }, locale: 'en', webUrl });

    expect(rendered.body).toContain('Win rate');
    expect(rendered.body).toContain('55');
    expect(rendered.url).toBe(`${webUrl}/me`);
  });

  it('declines the battle count in Russian', () => {
    const one = renderNotification({ notification: { ...session, battles: 1 }, locale: 'ru', webUrl });
    const many = renderNotification({ notification: { ...session, battles: 5 }, locale: 'ru', webUrl });

    expect(one.body).not.toBe(many.body.replace('5', '1'));
  });

  it('links a session to the player page with the session id', () => {
    const { url } = renderNotification({ notification: session, locale: 'en', webUrl });

    expect(new URL(url).searchParams.get('session')).toBe('s');
    expect(new URL(url).pathname).toContain('Tanker');
  });

  it('renders the clan weekly report with its own copy, not as an event reminder', () => {
    const report = samples.find((sample) => sample.event === 'clanWeeklyReport');

    expect(report && renderNotification({ notification: report, locale: 'en', webUrl }).title).toBe(
      notificationText({ locale: 'en', key: 'clan-weekly-report-title', values: { clanTag: 'BRNV' } })
    );
  });
});

describe('renderNotification replayOverflow', () => {
  it.each(NOTIFICATION_COPY.locales)('words the last-day notice apart from the 14-day one in %s', (locale) => {
    const notice = { event: 'replayOverflow', stored: 120, keep: 50, daysLeft: 14, deleteAt: '2027-03-01' } as const;
    const early = renderNotification({ notification: notice, locale, webUrl });
    const last = renderNotification({ notification: { ...notice, daysLeft: 1 }, locale, webUrl });

    expect(early.title).toContain(digit(14, locale));
    expect(last.title).not.toContain('1');
  });
});

describe('renderDigest', () => {
  it('uses the empty-week text when there were no battles', () => {
    const rendered = renderDigest({ digest: { battles: 0, wins: 0, damageDealt: 0, sessions: 0, marksGained: 0 }, locale: 'en', webUrl });

    expect(rendered.body).toBe(notificationText({ locale: 'en', key: 'digest-empty' }));
  });

  it.each(NOTIFICATION_COPY.locales)('averages damage over battles in %s', (locale) => {
    const rendered = renderDigest({ digest: { battles: 4, wins: 2, damageDealt: 10_000, sessions: 1, marksGained: 1 }, locale, webUrl });

    expect(rendered.body).toContain(digit(2500, locale));
    expect(rendered.body).toContain(`${new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).format(50)}%`);
  });
});
