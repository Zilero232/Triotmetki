import { describe, expect, it } from 'vitest';

import type { TeamHpData, TeamHpVehicle } from '../../../model/schemas';

import { TEAM_HP } from '../../../config';
import { teamHpView } from '../team-hp-view';

const vehicle = (max: number, hp: number, tier: string | null = null): TeamHpVehicle => ({ icon: null, tier, hp, max, alive: hp > 0 });

const data = (style: TeamHpData['style']): TeamHpData => ({
  style,
  allies: { hp: 3200, max: 5300, alive: 2, count: 3, frags: 2 },
  enemies: { hp: 900, max: 5200, alive: 1, count: 3, frags: 1 },
  show_score: true,
  score_alive: false,
  diff: 2300,
  tones: { ally: 'ally', enemy: 'enemy' },
  colors: { ally: null, enemy: null },
  vehicles: {
    allies: [vehicle(1800, 1200), vehicle(1500, 0)],
    enemies: [vehicle(1700, 900)]
  }
});

const tiered = (style: TeamHpData['style']): TeamHpData => ({
  ...data(style),
  vehicles: {
    allies: [vehicle(2000, 2000, 'X'), vehicle(1800, 1200), vehicle(1500, 0, 'IX')],
    enemies: [vehicle(1700, 900, 'X'), vehicle(1600, 0, 'IX')]
  }
});

const withAlliesAlive = (alive: number): TeamHpData => ({ ...data('full'), allies: { ...data('full').allies, alive } });

const enemiesOnly = (style: TeamHpData['style'], enemies: TeamHpVehicle[]): TeamHpData => ({
  ...data(style),
  vehicles: { allies: [], enemies }
});

const stripLabels = (strip: ReturnType<typeof teamHpView>['allies']['strip']) => strip.map((item) => (item.kind === 'tier' ? item.label : item.kind));

describe(teamHpView, () => {
  it('shows the numbers, the bars, the score and the signed difference in the full style', () => {
    const view = teamHpView(data('full'));

    expect(view).toMatchObject({ numbers: true, bars: true, strip: false, secondRow: true, score: { allies: '2', enemies: '1' }, diff: '+2 300' });
  });

  it('paints a lead good and a gap bad', () => {
    expect(teamHpView(data('full')).diffTone).toBe('good');
    expect(teamHpView({ ...data('full'), diff: -400 }).diffTone).toBe('bad');
  });

  it('keeps the bar styles without numbers', () => {
    const view = teamHpView(data('bars'));

    expect(view).toMatchObject({ numbers: false, bars: true });
  });

  it('leaves no centre block without a score or a difference', () => {
    const view = teamHpView({ ...data('bars'), show_score: false, diff: null });

    expect(view.hasCenter).toBe(false);
  });

  it('fills the bar by the share of HP left and writes the HP', () => {
    const view = teamHpView(data('full'));

    expect(view.allies.fill).toBe(Math.round((3200 / 5300) * TEAM_HP.barWidth));
    expect(view.allies.hp).toBe('3 200');
  });

  it('paints the sides with the tones of the payload', () => {
    const view = teamHpView(data('full'));

    expect(view.allies.paint).toEqual({ tone: 'ally', text: undefined, fill: undefined });
    expect(view.enemies.paint.tone).toBe('enemy');
  });

  it('paints a side in the colour the player set instead of its tone', () => {
    const view = teamHpView({ ...data('full'), colors: { ally: '#00FF00', enemy: null } });

    expect(view.allies.paint).toEqual({ tone: null, text: { color: '#00FF00' }, fill: { backgroundColor: '#00FF00' } });
  });

  it('keeps the frags in the score without the alive toggle', () => {
    const view = teamHpView(withAlliesAlive(3));

    expect(view.score).toEqual({ allies: '2', enemies: '1' });
  });

  it('puts the alive count, not the frags, in the score once toggled', () => {
    const view = teamHpView({ ...withAlliesAlive(3), score_alive: true });

    expect(view.score).toEqual({ allies: '3', enemies: '1' });
  });

  it('splits the bar into one segment per tank, sized by its max HP', () => {
    const { enemies } = teamHpView(enemiesOnly('segments', [vehicle(1800, 1200), vehicle(1500, 0)]));

    expect(enemies.segments).toMatchObject([
      { kind: 'segment', width: 91 },
      { kind: 'segment', width: 76, fill: 0, alive: false }
    ]);
  });

  it('draws the allied segments from the centre outwards', () => {
    const { allies } = teamHpView(data('segments'));

    expect(allies.segments.map((item) => item.kind === 'segment' && item.alive)).toEqual([false, true]);
  });

  it('parts the segments of two tiers with a gap', () => {
    const { enemies } = teamHpView(tiered('segments'));

    expect(enemies.segments.map((item) => item.kind)).toEqual(['segment', 'gap', 'segment']);
  });

  it('labels each tier group of the strip on its centre side', () => {
    const { allies, enemies } = teamHpView(tiered('icons'));

    expect(stripLabels(enemies.strip)).toEqual(['X', 'vehicle', 'IX', 'vehicle']);
    expect(stripLabels(allies.strip)).toEqual(['vehicle', 'IX', 'vehicle', 'vehicle', 'X']);
  });

  it('marks the dead in the icon strip', () => {
    const { enemies } = teamHpView(enemiesOnly('icons', [vehicle(1500, 0)]));

    expect(enemies.strip[0]).toMatchObject({ kind: 'vehicle', alive: false });
  });

  it('keeps the compact style to one row of numbers and the score', () => {
    const view = teamHpView({ ...data('compact'), show_score: false });

    expect(view).toMatchObject({ numbers: true, bars: false, secondRow: false, diff: null, score: { allies: '2', enemies: '1' } });
  });

  it('keeps the minimal style to one row of bars without numbers', () => {
    const view = teamHpView(data('minimal'));

    expect(view).toMatchObject({ numbers: false, bars: true, secondRow: false });
  });
});
