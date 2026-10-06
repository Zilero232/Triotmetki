from __future__ import absolute_import, division, print_function, unicode_literals

import json
import unittest

import _support
from otmetki.core.codec import decode_json, encode_json
from otmetki.companion.payload import (
    PayloadError,
    battle_outcome,
    build_battle_event,
    build_envelope,
    build_battle_start_event,
    build_moe_snapshot_event,
    build_queue_event,
)

EXTRAS = {
    'vehicle_name': 'ussr:R04_T-34',
    'vehicle_tier': 5,
    'map_name': '05_prohorovka',
    'queue_time_s': 12.5,
    'session_id': 'abc',
}
OWN_ACCOUNT_ID = 12345678


def own_vehicle(results):
    return results['personal'][1]


def envelope_of(event):
    return build_envelope([event], 'dev', OWN_ACCOUNT_ID, '0.1.0', '1.45', 1790000500, 'b1')


def results_in_platoon(*mates):
    results = _support.battle_results()
    results['players']['12345678']['prebattleID'] = 77
    for mate_id, player in mates:
        results['players'][mate_id] = dict(player, prebattleID=77)
    return results


class BattleEventTest(unittest.TestCase):

    def setUp(self):
        self.event = build_battle_event(_support.battle_results(), EXTRAS)

    def test_identity_fields(self):
        expected = {
            'type': 'battle_result',
            'event_id': 'battle:1152921504606847123',
            'arena_unique_id': '1152921504606847123',
            'arena_type_id': 5,
            'bonus_type': 1,
            'duration_s': 402,
            'occurred_at': 1790000402,
            'vehicle': {'tank_id': 1, 'name': 'ussr:R04_T-34', 'tier': 5},
            'queue_time_s': 12.5,
            'session_id': 'abc',
        }

        identity = {key: self.event[key] for key in expected}

        self.assertEqual(identity, expected)

    def test_stats(self):
        expected = {
            'damage_dealt': 2150,
            'damage_assisted_radio': 640,
            'damage_assisted_track': 310,
            'damage_blocked': 900,
            'frags': 2,
            'spotted': 3,
            'shots': 12,
            'piercing_enemy_hits': 7,
            'credits': 48000,
            'xp': 1150,
            'is_alive': True,
            'is_premium': False,
        }

        stats = {key: self.event['stats'][key] for key in expected}

        self.assertEqual(stats, expected)

    def test_result_is_a_win_for_the_winning_team(self):
        self.assertEqual(self.event['result'], 'win')

    def test_moe_comes_from_the_own_vehicle(self):
        self.assertEqual(self.event['moe'], {'marks_on_gun': 2, 'damage_rating': 8700, 'moving_avg_damage': 2610})

    def test_the_results_whole_percent_is_scaled_to_the_dossiers_hundredths(self):
        results = _support.battle_results()
        own_vehicle(results)['damageRating'] = 67

        event = build_battle_event(results)

        self.assertEqual(event['moe']['damage_rating'], 6700)

    def test_no_moe_for_low_tier(self):
        results = _support.battle_results()
        own_vehicle(results)['damageRating'] = 0

        event = build_battle_event(results)

        self.assertIsNone(event['moe'])

    def test_never_leaks_other_players(self):
        serialized = json.dumps(envelope_of(self.event))

        for foreign in ('98765', '87654321', 'enemy_player_secret', '4321', '2849'):
            self.assertNotIn(foreign, serialized)

    def test_solo_battle_has_no_platoon(self):
        self.assertIsNone(self.event['platoon'])

    def test_without_shots_in_extras_there_are_none(self):
        self.assertIsNone(self.event['shots'])

    def test_platoon_counts_only_own_team_mates(self):
        results = results_in_platoon(('23456789', {'name': 'platoon_friend_nick', 'team': 1}))
        results['players']['87654321']['prebattleID'] = 77

        event = build_battle_event(results)

        self.assertEqual(event['platoon'], {'size': 2})

    def test_platoon_sends_no_ids_or_names(self):
        results = results_in_platoon(('23456789', {'name': 'platoon_friend_nick', 'team': 1}))
        results['players']['87654321']['prebattleID'] = 77

        serialized = json.dumps(envelope_of(build_battle_event(results)))

        for foreign in ('23456789', 'platoon_friend_nick', '87654321'):
            self.assertNotIn(foreign, serialized)

    def test_platoon_size_is_capped(self):
        mates = [(mate_id, {'team': 1}) for mate_id in ('23456789', '34567890', '45678901')]
        results = results_in_platoon(*mates)

        event = build_battle_event(results)

        self.assertEqual(event['platoon'], {'size': 3})

    def test_shots_pass_through_from_extras(self):
        shot = {
            'damage': 402,
            'nominal': 390,
            'shell': 'armor_piercing',
            'outcome': 'damage',
            'distance_m': None,
            'fatal': False,
        }

        event = build_battle_event(_support.battle_results(), {'shots': [shot, 'junk']})

        self.assertEqual(event['shots'], [shot])

    def test_achievements_resolve_names_with_mastery_first(self):
        results = _support.battle_results()
        vehicle = own_vehicle(results)
        vehicle['markOfMastery'] = 4
        vehicle['achievements'] = [11, 12, 'junk', 99, 11]
        names = {11: 'warrior', 12: 'invader'}

        event = build_battle_event(results, {'achievement_name': names.get})

        self.assertEqual(event['achievements'], ['markOfMastery', 'warrior', 'invader'])

    def test_achievements_empty_without_resolver(self):
        results = _support.battle_results()
        own_vehicle(results)['achievements'] = [11]
        own_vehicle(results)['markOfMastery'] = 0

        event = build_battle_event(results)

        self.assertEqual(event['achievements'], [])

    def test_economy_costs(self):
        results = _support.battle_results()
        vehicle = own_vehicle(results)
        vehicle['freeXP'] = 57
        vehicle['autoRepairCost'] = 4200
        vehicle['autoLoadCost'] = (1800, 0)
        vehicle['autoEquipCost'] = [3000, 0, 0]

        stats = build_battle_event(results)['stats']

        self.assertEqual(stats['free_xp'], 57)
        self.assertEqual(stats['repair_cost'], 4200)
        self.assertEqual(stats['ammo_cost'], 1800)
        self.assertEqual(stats['consumables_cost'], 3000)

    def test_economy_costs_absent(self):
        results = _support.battle_results()
        own_vehicle(results)['autoLoadCost'] = None

        stats = build_battle_event(results)['stats']

        self.assertNotIn('ammo_cost', stats)

    def test_rejects_results_without_an_arena(self):
        with self.assertRaises(PayloadError):
            build_battle_event({})

    def test_rejects_results_without_an_own_vehicle(self):
        with self.assertRaises(PayloadError):
            build_battle_event({'arenaUniqueID': 5, 'personal': {'avatar': {}}})

    def test_list_wrapped_vehicle(self):
        results = _support.battle_results()
        results['personal'][1] = [own_vehicle(results)]

        event = build_battle_event(results)

        self.assertEqual(event['stats']['damage_dealt'], 2150)


class BattleOutcomeTest(unittest.TestCase):

    def test_no_winner_is_a_draw(self):
        self.assertEqual(battle_outcome(0, 1), 'draw')

    def test_own_team_winning_is_a_win(self):
        self.assertEqual(battle_outcome(1, 1), 'win')

    def test_other_team_winning_is_a_loss(self):
        self.assertEqual(battle_outcome(2, 1), 'loss')


class EnvelopeTest(unittest.TestCase):

    def setUp(self):
        event = build_queue_event(1, 33.333, 'arena', 1790000000, 1)
        self.envelope = build_envelope([event], 'dev', 42, '0.1.0', u'1.45.0', 1790000001, 'batch-1')
        self.body = encode_json(self.envelope)

    def test_envelope_round_trips_through_json(self):
        self.assertEqual(decode_json(self.body), self.envelope)

    def test_envelope_json_is_compact(self):
        self.assertNotIn(b' ', self.body)

    def test_envelope_json_is_canonical(self):
        self.assertEqual(self.body, encode_json(decode_json(self.body)))

    def test_queue_wait_is_rounded_to_a_tenth(self):
        self.assertEqual(self.envelope['events'][0]['wait_s'], 33.3)

    def test_envelope_requires_device(self):
        with self.assertRaises(PayloadError):
            build_envelope([], '', 1, '0.1.0', '', 0)


class BattleStartEventTest(unittest.TestCase):

    def test_battle_start_event_carries_only_own_tank(self):
        event = build_battle_start_event(1790000000.7, 1)

        self.assertEqual(event['type'], 'battle_start')
        self.assertEqual(event['occurred_at'], 1790000000)
        self.assertEqual(event['tank_id'], 1)

    def test_battle_start_event_drops_a_non_numeric_tank(self):
        event = build_battle_start_event(1790000000, 'x')

        self.assertIsNone(event['tank_id'])


class ContractTest(unittest.TestCase):

    def setUp(self):
        self.validator = _support.schema_validator('ingest.schema.json')
        if self.validator is None:
            self.skipTest('jsonschema is not installed')

    def test_matches_contract(self):
        battle_extras = {
            'vehicle_name': 'ussr:R04_T-34',
            'vehicle_tier': 5,
            'map_name': '05_prohorovka',
            'session_id': 's',
        }
        events = [
            build_battle_event(_support.battle_results(), battle_extras),
            build_moe_snapshot_event(1, 8712, 2610, 2, 350, 1790000000),
            build_queue_event(1, 20, 'dequeued', 1790000000, None),
        ]
        envelope = build_envelope(events, 'dev_1', OWN_ACCOUNT_ID, '0.1.0', '1.45.0', 1790000500)

        errors = sorted(self.validator.iter_errors(decode_json(encode_json(envelope))), key=str)

        self.assertEqual(errors, [])

    def test_example_matches_contract(self):
        example = _support.load_json(_support.CONTRACT_DIR + '/examples/ingest.example.json')

        errors = sorted(self.validator.iter_errors(example), key=str)

        self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
