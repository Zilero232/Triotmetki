from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.vendor import attr


@attr.s(frozen=True)
class Module(object):
    cd = attr.ib()
    name = attr.ib()


@attr.s(frozen=True)
class Turret(object):
    cd = attr.ib()
    name = attr.ib()
    guns = attr.ib(converter=tuple)

    def has_gun(self, gun_cd):
        return any(gun.cd == gun_cd for gun in self.guns)


@attr.s(frozen=True)
class ModuleChoice(object):
    turret = attr.ib()
    gun = attr.ib()


def _turret(turrets, turret_cd):
    for turret in turrets:
        if turret.cd == turret_cd:
            return turret
    return None


def _top_gun(turret):
    return turret.guns[-1].cd if turret.guns else None


def is_valid(turrets, choice):
    turret = _turret(turrets, choice.turret) if choice is not None else None
    return turret is not None and turret.has_gun(choice.gun)


def top_choice(turrets):
    if not turrets:
        return None
    turret = turrets[-1]
    return ModuleChoice(turret=turret.cd, gun=_top_gun(turret))


def default_choice(turrets, installed=None):
    if is_valid(turrets, installed):
        return installed
    return top_choice(turrets)


def with_turret(turrets, choice, turret_cd):
    turret = _turret(turrets, turret_cd)
    if turret is None:
        return choice
    keeps_gun = choice is not None and turret.has_gun(choice.gun)
    gun = choice.gun if keeps_gun else _top_gun(turret)
    return ModuleChoice(turret=turret.cd, gun=gun)


def picked(turrets, choice, turret_cd, gun_cd):
    wanted = with_turret(turrets, choice, turret_cd)
    candidate = ModuleChoice(turret=wanted.turret, gun=gun_cd) if wanted is not None else None
    if is_valid(turrets, candidate):
        return candidate
    return wanted


def _row(module, active_cd):
    return {'cd': module.cd, 'label': module.name, 'active': module.cd == active_cd}


def modules_state(turrets, choice):
    if not turrets or choice is None:
        return {'turrets': [], 'guns': []}
    turret = _turret(turrets, choice.turret) or turrets[-1]
    return {
        'turrets': [_row(item, choice.turret) for item in turrets],
        'guns': [_row(gun, choice.gun) for gun in turret.guns],
    }
