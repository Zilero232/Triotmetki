import { describe, expect, it } from 'vitest';

import { FIXTURE, LESTA_ARENA, readFixture } from '../../_tests/fixtures';
import {
  buildReplay,
  endOfStream,
  entityMethodPayload,
  frame,
  healthChangedArgs,
  lengthPrefixed,
  periodFrame,
  positionPayload
} from '../../_tests/replay-builder';
import { ReplayFormatError } from '../../errors/replay-format-error';
import { parseReplay } from '../../replay/replay';
import { collectTracks, parsePackets } from '../packets';
import { BATTLE_PERIOD, PACKET_TYPE } from '../packets.constants';

const RECORDER = 500;
const ENEMY = 502;
const UNKNOWN_TYPE = 0x77;
const CUSTOM_METHOD_IDS = { showShooting: 1, onHealthChanged: 3, showDamageFromShot: 10 };

const lestaPackets = [
  frame({ type: PACKET_TYPE.gameVersion, time: 0, payload: lengthPrefixed('1.30.0.0') }),
  periodFrame({ period: BATTLE_PERIOD.battle, time: 30 }),
  frame({
    type: PACKET_TYPE.position,
    time: 31.5,
    payload: positionPayload({ entityId: RECORDER, vehicleId: 0, position: { x: 10, y: 2, z: -40 }, yaw: 1.5 })
  }),
  frame({
    type: PACKET_TYPE.position,
    time: 32,
    payload: positionPayload({ entityId: RECORDER, vehicleId: 0, position: { x: 12, y: 2, z: -38 }, yaw: 1.25 })
  }),
  frame({
    type: PACKET_TYPE.chat,
    time: 40,
    payload: lengthPrefixed("<font color='#80D63A'>Recorder&nbsp;: </font><font>gl &amp; hf</font>")
  }),
  frame({
    type: PACKET_TYPE.entityMethod,
    time: 50,
    payload: entityMethodPayload({
      entityId: ENEMY,
      methodId: CUSTOM_METHOD_IDS.onHealthChanged,
      args: healthChangedArgs({ newHealth: 600, oldHealth: 900, attackerId: RECORDER })
    })
  }),
  frame({ type: UNKNOWN_TYPE, time: 51, payload: Uint8Array.of(1, 2, 3) })
];

const lestaReplay = (packets = [...lestaPackets, endOfStream()]) => buildReplay({ blocks: [LESTA_ARENA], packets });

describe('parsePackets on a synthetic Lesta replay', () => {
  it('flags Lesta as best effort and leaves entity methods raw without method ids', () => {
    const result = parsePackets({ replay: lestaReplay() });
    const method = result.packets.find((packet) => packet.kind === 'entityMethod');

    expect(result.support.status).toBe('best-effort');
    expect(result.support.methodIdSource).toBe('none');
    expect(result.support.notes.length).toBeGreaterThan(0);
    expect(method?.kind === 'entityMethod' && method.entityId).toBe(ENEMY);
  });

  it('decodes version, battle start, positions and chat', () => {
    const result = parsePackets({ replay: lestaReplay() });
    const version = result.packets.find((packet) => packet.kind === 'gameVersion');
    const chat = result.packets.find((packet) => packet.kind === 'chat');
    const track = collectTracks({ packets: result.packets }).get(RECORDER);

    expect(version?.kind === 'gameVersion' && version.version).toBe('1.30.0.0');
    expect(result.battleStartTime).toBe(30);
    expect(result.complete).toBe(true);
    expect(chat?.kind === 'chat' && chat.text).toBe('Recorder : gl & hf');

    expect(track?.map(({ time, x, z, yaw }) => ({ time, x, z, yaw }))).toEqual([
      { time: 31.5, x: 10, z: -40, yaw: 1.5 },
      { time: 32, x: 12, z: -38, yaw: 1.25 }
    ]);
  });

  it('returns unknown packet types with their raw payload', () => {
    const unknown = parsePackets({ replay: lestaReplay() }).packets.find((packet) => packet.type === UNKNOWN_TYPE);

    expect(unknown?.kind).toBe('unknown');
    expect(unknown?.kind === 'unknown' && [...unknown.payload]).toEqual([1, 2, 3]);
  });

  it('decodes damage once the caller supplies method ids', () => {
    const result = parsePackets({ replay: lestaReplay(), methodIds: CUSTOM_METHOD_IDS });
    const damage = result.packets.find((packet) => packet.kind === 'healthChanged');

    expect(result.support.methodIdSource).toBe('custom');
    expect(damage).toMatchObject({ vehicleId: ENEMY, attackerId: RECORDER, damage: 300, destroyed: false });
  });

  it('filters the kept packets by kind while still counting all of them', () => {
    const result = parsePackets({ replay: lestaReplay(), kinds: ['position'] });

    expect(result.packets.every((packet) => packet.kind === 'position')).toBe(true);
    expect(Object.values(result.counts).reduce((total, count) => total + count, 0)).toBe(lestaPackets.length + 1);
  });

  it('warns about a stream that ends without the end marker', () => {
    const result = parsePackets({ replay: lestaReplay([...lestaPackets, Uint8Array.of(9, 9, 9, 9, 9)]) });

    expect(result.complete).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('truncated'))).toBe(true);
  });

  it('refuses a replay that has no packet stream', () => {
    expect(() => parsePackets({ replay: buildReplay({ blocks: [LESTA_ARENA] }) })).toThrow(ReplayFormatError);
  });
});

describe('parsePackets on a real WG 1.26 replay', () => {
  const bytes = readFixture(FIXTURE.wgFull);
  const result = parsePackets({ replay: bytes });
  const { summary } = parseReplay(bytes);

  it('uses the verified WG method table and reaches the end marker', () => {
    expect(result.support.status).toBe('verified');
    expect(result.support.methodIdSource).toBe('wg-table');
    expect(result.complete).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.battleStartTime).toBeGreaterThan(0);
    expect(result.packets.filter((packet) => packet.kind === 'unknown' && packet.error !== null)).toEqual([]);
  });

  it('sums the recorder damage from health events to the damage in the battle results', () => {
    const recorder = summary.players.find((player) => player.isRecorder);

    const damage = result.packets.reduce(
      (total, packet) => (packet.kind === 'healthChanged' && packet.attackerId === recorder?.vehicleId ? total + (packet.damage ?? 0) : total),
      0
    );

    expect(damage).toBe(recorder?.result?.damageDealt);
  });

  it('tracks the movement of every vehicle in the battle', () => {
    const vehicleIds = new Set(summary.players.map((player) => player.vehicleId));
    const tracks = collectTracks({ packets: result.packets, vehicleIds });

    expect(tracks.size).toBe(vehicleIds.size);
  });

  it('decodes shots only for known vehicles', () => {
    const vehicleIds = new Set(summary.players.map((player) => player.vehicleId));
    const shots = result.packets.filter((packet) => packet.kind === 'shot');

    expect(shots.length).toBeGreaterThan(0);
    expect(shots.every((shot) => shot.kind === 'shot' && vehicleIds.has(shot.vehicleId))).toBe(true);
  });
});

describe('parsePackets on a real WG 1.14 replay without results', () => {
  it('still decodes the packet stream of an incomplete replay', () => {
    const result = parsePackets({ replay: readFixture(FIXTURE.wgIncomplete) });

    expect(result.summary.isComplete).toBe(false);
    expect(result.support.status).toBe('verified');
    expect(result.packets.some((packet) => packet.kind === 'position')).toBe(true);
  });
});
