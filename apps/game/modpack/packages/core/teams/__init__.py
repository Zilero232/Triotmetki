# -*- coding: utf-8 -*-
"""HP of both teams as the client already shows it (the team panels, the vehicle markers, the stock score strip),
shared by the team HP panel and the «Основной калибр» counter. Pure; the client glue that feeds it is
`core/client/battle/teams`.

Fair play: max HP and tier from the arena data behind the player panels, current HP from the health updates the
client receives (an unseen enemy keeps its last known HP, as on its marker), deaths from the arena. The team totals
are the stock score strip's own numbers when the client's BattleFieldCtrl feeds them (`set_team_health`)."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import clamp, is_int, is_number, string_types, to_text


def side_name(allies):
    return 'allies' if allies else 'enemies'


class TeamHp(object):

    def __init__(self, own_team):
        self.own_team = own_team
        self.vehicles = {}
        self.order = []
        self.team_health = None

    def add(self, vehicle_id, team, max_hp, alive=True, kind=None, level=None):
        """Adds or refreshes a vehicle; `kind` is its class tag (lightTank, AT-SPG, ...) and `level` its tier, as the
        player panels show them."""
        if not is_int(vehicle_id) or not is_int(team) or not is_number(max_hp) or max_hp <= 0:
            return False
        known = self.vehicles.get(vehicle_id)
        if known is None:
            self.order.append(vehicle_id)
        hp = known['hp'] if known is not None else int(max_hp)
        self.vehicles[vehicle_id] = {
            'team': team,
            'max': int(max_hp),
            'hp': min(hp, int(max_hp)) if alive else 0,
            'alive': bool(alive),
            'kind': to_text(kind) if isinstance(kind, string_types) else None,
            'level': level if is_int(level) else None,
        }
        return True

    def set_health(self, vehicle_id, hp):
        vehicle = self.vehicles.get(vehicle_id)
        if vehicle is None or not is_number(hp):
            return False
        hp = clamp(int(hp), 0, vehicle['max'])
        if hp == vehicle['hp']:
            return False
        vehicle['hp'] = hp
        return True

    def kill(self, vehicle_id):
        vehicle = self.vehicles.get(vehicle_id)
        if vehicle is None or not vehicle['alive']:
            return False
        vehicle['alive'] = False
        vehicle['hp'] = 0
        return True

    def set_team_health(self, allies_hp, enemies_hp, allies_total, enemies_total):
        """The stock score strip's totals (RU 1.45 battle_field_ctrl.py, IBattleFieldListener.updateTeamHealth): the
        HP left of the alive vehicles and the max HP of the vehicles alive when the controller counted them. They win
        over the sums of `totals()` for the HP shown; the strip's bar is hp / total, 0 without a total
        (frag_correlation_bar.py)."""
        numbers = (allies_hp, enemies_hp, allies_total, enemies_total)
        if not all(is_number(number) for number in numbers):
            return False
        health = {
            'allies': {'hp': int(allies_hp), 'max': int(allies_total)},
            'enemies': {'hp': int(enemies_hp), 'max': int(enemies_total)},
        }
        changed = health != self.team_health
        self.team_health = health
        return changed

    def team(self, allies):
        """The vehicles of one side in the order they joined the arena: [{team, max, hp, alive, kind, level}]."""
        known = [self.vehicles[vehicle_id] for vehicle_id in self.order if vehicle_id in self.vehicles]
        return [vehicle for vehicle in known if (vehicle['team'] == self.own_team) == allies]

    def totals(self, allies):
        """Sums over the arena's vehicles of one side: {hp, max, alive, count}."""
        vehicles = self.team(allies)
        return {
            'hp': sum(vehicle['hp'] for vehicle in vehicles),
            'max': sum(vehicle['max'] for vehicle in vehicles),
            'alive': len([vehicle for vehicle in vehicles if vehicle['alive']]),
            'count': len(vehicles),
        }

    def health(self, allies):
        """The HP left and the total HP of one side the stock score strip shows: {hp, max}."""
        if self.team_health is not None:
            return dict(self.team_health[side_name(allies)])
        totals = self.totals(allies)
        return {'hp': totals['hp'], 'max': totals['max']}

    def values(self):
        allies = self.totals(True)
        enemies = self.totals(False)
        allies_health = self.health(True)
        enemies_health = self.health(False)
        return {
            'allies_hp': allies_health['hp'],
            'allies_max': allies_health['max'],
            'allies_alive': allies['alive'],
            'enemies_hp': enemies_health['hp'],
            'enemies_max': enemies_health['max'],
            'enemies_alive': enemies['alive'],
            'allies_frags': enemies['count'] - enemies['alive'],
            'enemies_frags': allies['count'] - allies['alive'],
            'diff': allies_health['hp'] - enemies_health['hp'],
        }
