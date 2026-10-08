from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.armor import PENETRATION_RANDOMNESS, power_at
from ....core.client.armor import distance_factor, gun_shots, shell_randomization
from ....core.log import log
from ..model import Attack, Attacker, shell_label
from .garage import tank_row_of


def _attack(shot, shell, distance):
    power = power_at(shell, distance, distance_factor(shot, distance))
    return Attack(shell=shell, power=power, randomness=PENETRATION_RANDOMNESS)


# The tank on the screen as the attacker: its type id and the descriptor of the turret and gun it shows.
class ShownVehicle(object):

    def __init__(self, tank_id, descriptor):
        self.intCD = tank_id
        self.descriptor = descriptor


# Fair play: the attacker is the player's own garage tank or the tank on the screen, never another player's.
class AttackerFire(object):

    def __init__(self, distance):
        self.attacker = None
        self.shots = ()
        self.attacks = ()
        self.shell_index = 0
        self.distance = distance

    @property
    def attack(self):
        if not self.attacks:
            return None
        return self.attacks[self.shell_index]

    def set_from(self, vehicle, is_target):
        if vehicle is None:
            return False
        row = tank_row_of(vehicle.intCD, not is_target)
        if row is None:
            return False

        self.attacker = Attacker(cd=row.cd, name=row.name, tier=row.tier, is_target=is_target)
        self.shots = gun_shots(vehicle.descriptor)
        self.shell_index = 0
        self.refresh()
        self._log()
        return True

    def pick_shell(self, index):
        if index >= len(self.attacks):
            return False
        self.shell_index = index
        return True

    def set_distance(self, metres):
        self.distance = metres
        self.refresh()

    def refresh(self):
        self.attacks = tuple(_attack(shot, shell, self.distance) for shot, shell in self.shots)
        if self.attacks:
            self.shell_index = min(self.shell_index, len(self.attacks) - 1)

    def labels(self, translate):
        return tuple(shell_label(attack.shell, attack.power, translate) for attack in self.attacks)

    def _log(self):
        randomization = [shell_randomization(shot) for shot, _ in self.shots]
        log('armor view: attacker %s, %d shells, client randomization %s' % (
            self.attacker.name, len(self.shots), randomization,
        ))
