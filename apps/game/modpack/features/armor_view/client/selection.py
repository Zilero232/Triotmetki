from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.log import log
from ..model import default_choice, picked, search
from .garage import (
    catalogue_rows,
    garage_rows,
    garage_vehicles,
    installed_modules,
    own_vehicle,
    selected_tank,
    tank_row_of,
    turrets_of,
)


class Target(object):

    def __init__(self, row, turrets, choice, chassis=None):
        self.row = row
        self.turrets = turrets
        self.choice = choice
        self.chassis = chassis

    @property
    def cd(self):
        return self.row.cd


def own_target(vehicle):
    if vehicle is None:
        return None
    row = tank_row_of(vehicle.intCD, True)
    modules = installed_modules(vehicle)
    if row is None or modules is None:
        return None

    choice, chassis = modules
    return Target(row, turrets_of(vehicle.intCD), choice, chassis)


def foreign_target(tank_id):
    row = tank_row_of(tank_id, False)
    if row is None:
        return None
    turrets = turrets_of(tank_id)
    return Target(row, turrets, default_choice(turrets))


# The tank on the screen and the lists it is picked from: the own garage (the selected tank as the hangar shows it is
# home, which needs no vehicle swap) and every tank of the client, read on the first search only.
class TankSelection(object):

    def __init__(self):
        self.reset()

    def reset(self):
        self.vehicles = ()
        self.garage = ()
        self.home = None
        self.target = None
        self.catalogue = None
        self.query = u''
        self.matches = ()

    def begin(self, tank_id):
        self.reset()
        self.vehicles = garage_vehicles()
        self.garage = garage_rows(self.vehicles)
        self.home = own_target(selected_tank())
        self.target = self.target_of(tank_id) or self.home

    def own(self, tank_id):
        return own_vehicle(self.vehicles, tank_id)

    def target_of(self, tank_id):
        if tank_id is None:
            return None
        if self.home is not None and tank_id == self.home.cd:
            return self.home
        own = self.own(tank_id)
        if own is not None:
            return own_target(own)
        return foreign_target(tank_id)

    def is_home(self):
        home = self.home
        target = self.target
        if home is None or target is None:
            return False
        return target.cd == home.cd and target.choice == home.choice

    def pick_tank(self, tank_id):
        target = self.target_of(tank_id)
        if target is None:
            return False
        self.target = target
        return True

    def pick_modules(self, turret_cd, gun_cd):
        target = self.target
        if target is None:
            return False
        target.choice = picked(target.turrets, target.choice, turret_cd, gun_cd)
        return True

    def search(self, query):
        self.query = query
        if query and self.catalogue is None:
            self.catalogue = catalogue_rows()
            log('armor view: %d tanks to search' % len(self.catalogue))
        own_ids = set(row.cd for row in self.garage)
        self.matches = tuple(search(self.catalogue or (), query, own_ids))
