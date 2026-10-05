import { describe, expect, it } from 'vitest';

import { ARENA_BONUS_TYPE, GAME_MODE_BONUS_TYPES } from '../../../../../common/lib';
import { BATTLE_CORROBORATION } from '../../../config';
import { corroboratedBattleSql, ownerTrustedBattleSql } from '../battle-corroboration';

describe('corroboratedBattleSql', () => {
  it('trusts a random battle when the Lesta API deltas for the same account and tank cover it', () => {
    expect(corroboratedBattleSql.sql).toMatch(
      /FROM tank_battle_delta corroboration\s+WHERE corroboration\.account_id = b\.account_id\s+AND corroboration\.tank_id = b\.tank_id/u
    );

    expect(corroboratedBattleSql.sql).toContain('corroboration.battles >= 1');
    expect(corroboratedBattleSql.sql).toContain('corroboration.damage_dealt >= b.damage_dealt');
  });

  it('looks for the deltas only inside the configured window after the battle', () => {
    expect(corroboratedBattleSql.values).toContain(BATTLE_CORROBORATION.windowHours);
    expect(corroboratedBattleSql.sql).toContain('corroboration.captured_at >= b.started_at');
  });

  it('reads the deltas only for the random battle types the collector covers', () => {
    expect(BATTLE_CORROBORATION.collectorBattleTypes).toEqual(GAME_MODE_BONUS_TYPES.random.map(String));
    expect(BATTLE_CORROBORATION.collectorBattleTypes).toContain(String(ARENA_BONUS_TYPE.regular));
    expect(corroboratedBattleSql.sql).toMatch(/b\.battle_type = ANY\(\?::text\[\]\)\s+AND EXISTS \(\s+SELECT 1\s+FROM tank_battle_delta/u);
    expect(corroboratedBattleSql.values).toContainEqual(BATTLE_CORROBORATION.collectorBattleTypes);
  });

  it('no longer lets a non-random battle through on the owner signature alone', () => {
    expect(corroboratedBattleSql.sql).not.toContain('<> ALL');
  });

  it('accepts a parsed replay of the same battle that shows the same damage for the account', () => {
    expect(corroboratedBattleSql.sql).toContain('witness.arena_unique_id = b.arena_unique_id');
    expect(corroboratedBattleSql.sql).toContain("witness.status = 'parsed'");
    expect(corroboratedBattleSql.sql).toContain('witness.damage_dealt = b.damage_dealt');
    expect(corroboratedBattleSql.sql).toContain("(seen->'result'->>'damageDealt')::numeric = b.damage_dealt");
  });

  it('refuses a replay uploaded by the user who owns the account or the reporting device', () => {
    expect(corroboratedBattleSql.sql).toContain('witness.uploader_user_id IS NOT NULL');

    expect(corroboratedBattleSql.sql).toMatch(
      /NOT EXISTS \(\s*SELECT 1 FROM user_lesta_account owner\s+WHERE owner\.user_id = witness\.uploader_user_id AND owner\.account_id = b\.account_id/u
    );

    expect(corroboratedBattleSql.sql).toMatch(
      /NOT EXISTS \(\s*SELECT 1 FROM mod_device reporter\s+WHERE reporter\.id = b\.device_id AND reporter\.user_id = witness\.uploader_user_id/u
    );
  });
});

describe('ownerTrustedBattleSql', () => {
  it('keeps the non-random battles the owner signed for the owner pages', () => {
    expect(ownerTrustedBattleSql.sql).toMatch(/^\(\s+b\.battle_type <> ALL\(\?::text\[\]\)\s+OR /u);
    expect(ownerTrustedBattleSql.values).toContainEqual(BATTLE_CORROBORATION.collectorBattleTypes);
  });

  it('still requires the same evidence for a random battle', () => {
    expect(ownerTrustedBattleSql.sql).toContain(corroboratedBattleSql.sql);
  });
});
