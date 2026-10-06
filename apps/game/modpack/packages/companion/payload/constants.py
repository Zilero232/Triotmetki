from __future__ import absolute_import, division, print_function, unicode_literals

SCHEMA_VERSION = 1
REALM = 'RU'
MAX_PLATOON_SIZE = 3
MAX_ACHIEVEMENTS = 64
MAX_ACHIEVEMENT_NAME = 64
MASTERY_BADGES = {4: 'markOfMastery', 3: 'markOfMasteryI', 2: 'markOfMasteryII', 1: 'markOfMasteryIII'}
STAT_FIELDS = (
    ('damage_dealt', 'damageDealt'),
    ('damage_assisted_radio', 'damageAssistedRadio'),
    ('damage_assisted_track', 'damageAssistedTrack'),
    ('damage_assisted_stun', 'damageAssistedStun'),
    ('damage_blocked', 'damageBlockedByArmor'),
    ('spotted', 'spotted'),
    ('frags', 'kills'),
    ('damaged', 'damaged'),
    ('shots', 'shots'),
    ('direct_hits', 'directHits'),
    ('direct_enemy_hits', 'directEnemyHits'),
    ('piercings', 'piercings'),
    ('piercing_enemy_hits', 'piercingEnemyHits'),
    ('xp', 'xp'),
    ('original_xp', 'originalXP'),
    ('credits', 'credits'),
    ('original_credits', 'originalCredits'),
    ('subtotal_credits', 'subtotalCredits'),
    ('factual_credits', 'factualCredits'),
    ('life_time_s', 'lifeTime'),
)
COST_FIELDS = (
    ('repair_cost', 'autoRepairCost'),
    ('ammo_cost', 'autoLoadCost'),
    ('consumables_cost', 'autoEquipCost'),
)
