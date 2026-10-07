# -*- coding: utf-8 -*-
"""The team HP numbers of the client's own BattleFieldCtrl, heard the way the stock score strip hears them.

RU 1.45 client source: gui/battle_control/controllers/battle_field_ctrl.py pushes its numbers to the view components
linked to BATTLE_CTRL_ID.BATTLE_FIELD_CTRL (IBattleFieldListener: updateVehicleHealth, updateDeadVehicles,
updateTeamHealth, updateSpottedStatus); FragCorrelationBar is one of them. SharedPage._startBattleSession
(battle/shared/page.py) links the page's components through the session provider (registerViewComponents, then
addViewComponent for its DroneMusicPlayer with VIEW_COMPONENT_RULE.NONE). We link ours the same way right after it,
before the page's Flash components register, so the controller starts once with all of them and never resets its
totals mid-battle for us.

Fair play: the spotted status the controller also pushes is left unread."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....events import Listeners
from ....hooks import override
from ....log import log, safe
from .constants import FEED_ALIAS

try:
    from gui.battle_control.battle_constants import BATTLE_CTRL_ID, VIEW_COMPONENT_RULE
    from gui.Scaleform.daapi.view.battle.shared.page import SharedPage
except ImportError:
    BATTLE_CTRL_ID = VIEW_COMPONENT_RULE = SharedPage = None


class BattleFieldFeed(object):

    def __init__(self):
        self.listeners = Listeners('team HP listener')
        self.reset()

    def reset(self):
        self.health = {}
        self.dead = frozenset()
        self.team_health = None

    def listen(self, callback):
        self.listeners.add(callback)

    def forget(self, callback):
        self.listeners.remove(callback)

    @safe
    def updateVehicleHealth(self, vehicleID, newHealth, maxHealth):
        self.health[vehicleID] = newHealth
        self._notify()

    @safe
    def updateDeadVehicles(self, aliveAllies, deadAllies, aliveEnemies, deadEnemies):
        self.dead = frozenset(deadAllies) | frozenset(deadEnemies)
        self._notify()

    @safe
    def updateTeamHealth(self, alliesHP, enemiesHP, totalAlliesHP, totalEnemiesHP):
        self.team_health = (alliesHP, enemiesHP, totalAlliesHP, totalEnemiesHP)
        self._notify()

    def updateSpottedStatus(self, vehicleID, status):
        pass

    def _notify(self):
        self.listeners.notify()


_state = {'feed': None}


def battle_field_feed():
    if _state['feed'] is None:
        _state['feed'] = BattleFieldFeed()
        _install(_state['feed'])
    return _state['feed']


def _install(feed):
    if SharedPage is None:
        log('team HP: the stock BattleFieldCtrl is out of reach, the arena data stays the only source')
        return

    @override(SharedPage, '_startBattleSession')
    def _start_battle_session(original, page, *args, **kwargs):
        result = original(page, *args, **kwargs)
        feed.reset()
        _link(page, feed)
        return result

    @override(SharedPage, '_stopBattleSession')
    def _stop_battle_session(original, page, *args, **kwargs):
        result = original(page, *args, **kwargs)
        feed.reset()
        return result


def _link(page, feed):
    provider = getattr(page, 'sessionProvider', None)
    if getattr(getattr(provider, 'dynamic', None), 'battleField', None) is None:
        return
    try:
        provider.registerViewComponents((BATTLE_CTRL_ID.BATTLE_FIELD_CTRL, (FEED_ALIAS,)))
    except Exception as error:
        log('team HP: %s' % error)
    provider.addViewComponent(FEED_ALIAS, feed, rule=VIEW_COMPONENT_RULE.NONE)
