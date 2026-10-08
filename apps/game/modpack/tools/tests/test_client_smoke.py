# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function

import copy
import importlib
import json
import os
import random
import shutil
import sys
import tempfile
import time
import types
import unittest

import _scaleform
import _support
from otmetki.companion.binding import Credentials
from otmetki.core.shells.constants import BATTLE_LOG_SHELL_NAMES
from otmetki.core.vendor.enum34 import IntEnum

ACCOUNT = 12345678
OTHER_ACCOUNT = 87654321
OTHER_TANK = 999
# The switches that are off by default and that the stories play: the opt-in panels and the components that override
# client views or send client requests.
BATTLE_OPT_INS = (
    'battle_progress', 'battle_gun_arc', 'battle_platoon_points', 'battle_bush_circle',
    'battle_chat_filter', 'battle_auto_messages', 'streamer_mode', 'hangar_tweaks', 'hangar_auto_resupply',
    'hangar_notification_filter', 'hangar_cleaner',
)
REGISTERED = tuple(_support.feature_ids()) + ('ui',)
ENTRY_MODULES = ('mod_otmetki',) + tuple('mod_otmetki_' + key for key in REGISTERED)
STUBBED = (
    'gui', 'BigWorld', 'BattleReplay', 'CurrentVehicle', 'PlayerEvents', 'BattleFeedbackCommon', 'dossiers2',
    'constants', 'SoundGroups', 'messenger', 'notification', 'account_helpers', 'helpers', 'skeletons', 'frameworks',
    'openwg_gameface', 'items', 'vehicle_outfit', 'Keys', 'Avatar', 'Vehicle', 'Math', 'arena_bonus_type_caps',
    'AvatarInputHandler', 'aih_constants', 'helpers_common',
)
LOAD_ORDER_SEEDS = (0, 1, 2, 3)
PLAYER_EVENTS = (
    'onAccountShowGUI', 'onEnqueued', 'onDequeued', 'onArenaCreated', 'onAvatarReady', 'onAvatarBecomeNonPlayer',
    'onBattleResultsReceived',
)
# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE values.
BATTLE_EVENT_TYPES = {
    'SPOTTED': 0,
    'RADIO_ASSIST': 1,
    'TRACK_ASSIST': 2,
    'BASE_CAPTURE_POINTS': 3,
    'BASE_CAPTURE_DROPPED': 4,
    'TANKING': 5,
    'CRIT': 6,
    'DAMAGE': 7,
    'KILL': 8,
    'RECEIVED_CRIT': 9,
    'RECEIVED_DAMAGE': 10,
    'STUN_ASSIST': 11,
}
KINDS = type('BATTLE_EVENT_TYPE', (object,), BATTLE_EVENT_TYPES)
# RU 1.45 gui/battle_control/battle_constants.VEHICLE_VIEW_STATE values the features read.
VIEW_STATE = {'FIRE': 1, 'DEVICES': 2, 'HEALTH': 4, 'OBSERVED_BY_ENEMY': 4096, 'SWITCHING': 16384, 'STUN': 65536}
ARENA_PERIODS = {'WAITING': 1, 'PREBATTLE': 2, 'BATTLE': 3, 'AFTERBATTLE': 4}
GUI_SPACES = {'LOGIN': 1, 'WAITING': 2, 'LOBBY': 3, 'BATTLE': 5}
NOTIFICATION_TYPES = {
    'MESSAGE': 1,
    'NOTIFY_CENTER_POP_UP': 4,
    'RECRUIT_REMINDER': 13,
    'AUCTION_STAGE_START': 19,
    'TRADING_CARAVAN_REFILL': 19,
}
HUD_OFF = (
    'battle_damage_log', 'hangar_info', 'battle_team_hp', 'battle_sixth_sense',
    'hangar_battle_results', 'battle_progress',
)
BATTLE_PANELS = [
    'battle_progress', 'damage_log', 'sixth_sense', 'team_hp',
]
DESCRIBED_PANELS = [
    'battle_hotkeys', 'battle_loadout', 'battle_progress', 'crosshair', 'damage_log', 'gun_arc',
    'hangar_marks', 'last_battle', 'marks_panel', 'platoon_points', 'sixth_sense', 'team_hp',
]
HUD_EDIT_PREVIEWS = [
    'battle_loadout', 'battle_progress', 'crosshair', 'damage_log', 'gun_arc', 'hangar_marks',
    'last_battle', 'marks_panel', 'platoon_points', 'sixth_sense',
]
# Where the reticle sits on a 1920x1080 screen; CROSSHAIR_VIEW_ID (RU 1.45): the arcade view.
RETICLE_SCREEN = {'position': (960, 540), 'size': (1920, 1080), 'scale': 1.0}
ARCADE_VIEW = 1
OWN_SHOT = {
    'damage': 390,
    'nominal': None,
    'shell': 'armor_piercing',
    'outcome': 'damage',
    'distance_m': None,
    'fatal': False,
}
HANGAR_LABEL_PLACE = {'x': 1, 'y': 2, 'alignX': 'left', 'alignY': 'top'}
# core.inject.constants: the alias the HUD page is registered under in the hangar view.
INJECT_ALIAS = 'otmetkiHudInject'
INJECT_LABEL = 'otmetki.hangar_test'
# BATTLE_VIEW_ALIASES the battle page registered: the stock damage log the damage log replaces once drawn.
STOCK_COMPONENTS = ('battleDamageLogPanel', 'teamBasesPanel', 'minimap', 'consumablesPanel')
SESSION_LABEL_PLACE = {'x': 0, 'y': 0, 'alignX': 'right', 'alignY': 'top'}
MOE_SNAPSHOT = {
    'tank_id': 1,
    'name': 'ussr:R04_T-34',
    'tier': 5,
    'damage_rating': 8150,
    'moving_avg_damage': 2500,
    'marks_on_gun': 1,
    'battles': 120,
}
MOE_CURVE = {'tank_id': 1, 'thresholds': {'65': 2000, '85': 2600, '95': 3100}}
HANGAR_MOE = {'tank_id': 1, 'damage_rating': 8600, 'moving_avg_damage': 2550, 'marks_on_gun': 2}
ARENA_MODIFIERS = 'arena-modifiers'
ROLE_SLOT = 3
# A battle after the one the results fixture is of.
NEXT_ARENA = 4243
REPLAY_ID = '0f8e2d4c-6b1a-4f3e-9d2c-7a5b3c1d9e8f'
BUSH_CIRCLE_KEY = 48
STREAMER_KEY = 35
CAPTURE_SHOT_KEY, CAPTURE_NEXT_KEY = 88, 87
LEFT_CONTROL, LEFT_SHIFT, RIGHT_CONTROL, RIGHT_SHIFT = 29, 42, 157, 54
# RU 1.45 Vehicle.showDamageFromShot: a packed hit point (flags, component, position and angles).
FRONT_HULL_PEN = 4 | (1 << 8) | (120 << 16) | (100 << 24) | (250 << 32) | (130 << 40) | (110 << 48) | (255 << 56)
RICOCHET_POINT = 2 | (1 << 8) | (120 << 16) | (130 << 40)
BUSH_CIRCLE_AREA = ('content/Interface/CheckPoint/CheckPoint.visual', (30.0, 30.0), 0.5, 0xFFFFFFFF)
EARLY_EXIT_POLLS = 40
HANGAR_VIEW_PACKAGES = (
    'gui.Scaleform', 'gui.Scaleform.daapi', 'gui.Scaleform.daapi.view', 'gui.Scaleform.daapi.view.lobby',
    'gui.Scaleform.daapi.view.lobby.hangar', 'gui.impl', 'gui.impl.lobby', 'gui.impl.lobby.offers',
)
CHAT_PACKAGES = (
    'messenger', 'messenger.gui', 'messenger.gui.Scaleform', 'messenger.gui.Scaleform.channels',
    'messenger.gui.Scaleform.channels.bw_chat2', 'messenger.ext', 'notification',
)


def account_part(state, key, account_id=ACCOUNT):
    return state['accounts'][str(account_id)][key]


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class Sink(object):

    def write(self, text):
        pass

    def flush(self):
        pass


class Capture(Sink):

    def __init__(self):
        self.parts = []

    def write(self, text):
        self.parts.append(text)


class Player(object):

    def __init__(self, account_id=None, arena_id=None):
        self.databaseID = account_id
        self.arenaUniqueID = arena_id
        self.guiSessionProvider = None
        self.name = 'player_%s' % account_id
        self.models = []

    def addModel(self, model):
        self.models.append(model)

    def delModel(self, model):
        self.models.remove(model)

    def getVehicleDescriptor(self):
        return getattr(self, 'vehicleTypeDescriptor', None)


class BattleResultsCache(object):
    # RU 1.45 client source (client_common/shared_utils/account_helpers/BattleResultsCache.py): get() sends
    # CMD_REQ_BATTLE_RESULTS and answers RES_COOLDOWN to everyone else until the stream is back; load()
    # reads the file the game saved; convertToFullForm() unpacks it.
    RES_COOLDOWN = -8

    def __init__(self):
        self.server_requests = []
        self.waiting = False
        self.saved = {}

    def get(self, arena_id, callback):
        if self.waiting:
            callback(self.RES_COOLDOWN, None)
            return
        self.waiting = True
        self.server_requests.append(arena_id)

    def load(self, name, arena_id):
        return self.saved.get((name, arena_id))

    @staticmethod
    def convertToFullForm(compact):
        return compact


def module(name, **attrs):
    stub = types.ModuleType(name)
    stub.__dict__.update(attrs)
    sys.modules[name] = stub
    _support.link_to_parent(name)
    return stub


def package(name, path=()):
    stub = module(name)
    stub.__path__ = list(path)
    return stub


def constants(name, values):
    return type(name, (object,), values)


def instance(name, attrs):
    """An object of a one-off class: the client objects the features only read attributes and methods of."""
    return type(name, (object,), attrs)()


def key_event(key, is_repeated=False):
    if is_repeated:
        return instance('KeyEvent', {'key': key, 'isRepeatedEvent': lambda event: True})
    return instance('KeyEvent', {'key': key})


def result(success, message):
    return instance('Result', {'success': success, 'userMsg': message})


def response_json(data):
    return Response(200, json.dumps(data).encode('utf-8'))


def contract_example(name):
    example = _support.load_json(os.path.join(_support.CONTRACT_DIR, 'examples', name))
    example['account_id'] = ACCOUNT
    return example


SHELL_TYPES = IntEnum('BATTLE_LOG_SHELL_TYPES', [(name, index) for index, name in enumerate(BATTLE_LOG_SHELL_NAMES)])
SERVER_TIME = 1790000100.0
CLIENT_VERSION = u'Мир танков 1.45.0.5231'
OWN_VEHICLE = 101
ENEMY_VEHICLE = 202
ALLY_VEHICLE = 303
# RU 1.45 common/constants.py ARENA_GUI_TYPE.TRAINING: no High Caliber medal there.
TRAINING_GUI_TYPE = 2
HIT_STATES = (
    'VEHICLE_HEALTH', 'VEHICLE_HIT', 'VEHICLE_RICOCHET', 'VEHICLE_ARMOR_PIERCED', 'VEHICLE_CRITICAL_HIT',
    'VEHICLE_DEAD',
)
FEEDBACK_IDS = {name: index + 100 for index, name in enumerate(HIT_STATES)}


class Extra(object):
    # RU 1.45 feedback_events._DamageExtra: the attack reason checks are methods of the extra.

    def __init__(self, damage=0, shell=SHELL_TYPES.ARMOR_PIERCING, crits=0, reason='shot'):
        self.damage = damage
        self.shell = shell
        self.crits = crits
        self.reason = reason

    def isFire(self):
        return self.reason == 'fire'

    def isRam(self):
        return self.reason == 'ram'

    def getDamage(self):
        return self.damage

    def isShot(self):
        return self.reason == 'shot'

    def getShellType(self):
        return self.shell

    def getCritsCount(self):
        return self.crits


class Feedback(object):

    def __init__(self, kind, target_id, extra):
        self.kind = kind
        self.target_id = target_id
        self.extra = extra

    def getBattleEventType(self):
        return self.kind

    def getTargetID(self):
        return self.target_id

    def getExtra(self):
        return self.extra


class Summary(object):

    def getTotalDamage(self):
        return 2150

    def getTotalAssistDamage(self):
        return 950

    def getTotalBlockedDamage(self):
        return 900

    def getTotalStunDamage(self):
        return 0


def summary_with_stun(stun):
    summary = Summary()
    summary.getTotalStunDamage = lambda: stun
    return summary


class VehicleInfo(object):
    # RU 1.45 arena_vos.VehicleArenaInfoVO: vehicleType is a VehicleTypeInfoVO with shortName, maxHealth and
    # classTag.

    def __init__(self, vehicle_id, team, name, max_health, alive=True, class_tag='mediumTank'):
        self.vehicleID = vehicle_id
        self.team = team
        self.vehicleType = instance('VehicleType', {
            'shortName': name,
            'name': name,
            'maxHealth': max_health,
            'classTag': class_tag,
        })
        self.alive = alive

    def isAlive(self):
        return self.alive


class ArenaDP(object):

    def __init__(self, vehicles):
        self.vehicles = {info.vehicleID: info for info in vehicles}

    def getVehicleInfo(self, vehicle_id):
        return self.vehicles.get(vehicle_id)

    def isEnemyTeam(self, team):
        return team != 1

    def getVehiclesInfoIterator(self):
        return iter(list(self.vehicles.values()))

    def getNumberOfTeam(self):
        return 1


class Ammo(object):
    # RU 1.45 ammo_ctrl.AmmoController: the setup switch battle_loadout follows.

    def __init__(self):
        self.onGunSettingsSet = Event()


class BattleSession(object):

    def __init__(self):
        self.feedback = instance('Feedback', {})
        for name in ('onPlayerFeedbackReceived', 'onPlayerSummaryFeedbackReceived', 'onVehicleFeedbackReceived'):
            setattr(self.feedback, name, Event())
        self.vehicle_state = instance('VehicleState', {'getControllingVehicleID': lambda state: OWN_VEHICLE})
        self.vehicle_state.onVehicleStateUpdated = Event()
        self.shared = instance('Shared', {})
        self.shared.feedback = self.feedback
        self.shared.vehicleState = self.vehicle_state
        self.shared.ammo = Ammo()
        self.dp = ArenaDP([
            VehicleInfo(OWN_VEHICLE, 1, 'T-34', 1000),
            VehicleInfo(ALLY_VEHICLE, 1, 'KV-1', 1200, class_tag='heavyTank'),
            VehicleInfo(ENEMY_VEHICLE, 2, 'Pz. IV', 900),
        ])
        self.arena = instance('Arena', {'period': 3, 'periodEndTime': SERVER_TIME + 300})
        self.arena.onVehicleKilled = Event()
        self.arena.onVehicleAdded = Event()
        self.arena.onVehicleUpdated = Event()
        self.arena.onPeriodChange = Event()
        self.arena.vehicles = {}
        self.arenaVisitor = instance('ArenaVisitor', {'getArenaModifiers': lambda visitor: ARENA_MODIFIERS})

    def getArenaDP(self):
        return self.dp

    def state(self, name, value):
        self.vehicle_state.onVehicleStateUpdated(VIEW_STATE[name], value)

    def control(self, vehicle_id):
        self.vehicle_state.getControllingVehicleID = lambda: vehicle_id

    def hit(self, state_name, vehicle_id, value=None):
        self.feedback.onVehicleFeedbackReceived(FEEDBACK_IDS[state_name], vehicle_id, value)

    def own_feedback(self, *events):
        self.feedback.onPlayerFeedbackReceived(list(events))


class Response(object):

    def __init__(self, code, body, headers=None):
        self.responseCode = code
        self.body = body
        self._headers = dict(headers or {})

    def headers(self):
        return dict(self._headers)


class Device(object):
    # RU 1.45 common/items/artefacts.py OptionalDevice: what the stock battle tooltip of a device reads.

    def __init__(self, name, categories=(), deluxe=False):
        self.tierlessName = self.groupName = self.userString = name
        self.compactDescr = name
        self.icon = (name, 0, 0)
        self.categories = set(categories)
        self.isDeluxe = deluxe
        self.shortDescriptionSpecial = u'{colorTagOpen}+10 %{colorTagClose} ' + name


def public_descriptor(tank_id):
    # RU 1.45 Vehicle.def publicInfo (PUBLIC_VEHICLE_INFO, ALL_CLIENTS): the Vehicle entity's descriptor, which
    # Avatar.getVehicleDescriptor() returns, is the same for every client and carries no equipment.
    return instance('Descriptor', {
        'type': instance('VehicleType', {'compactDescr': tank_id}),
        'iterOptDevsWithSlots': lambda descriptor: iter(()),
        'makeCompactDescr': lambda descriptor: 'public-compact-descr',
    })


def device_slot(*categories):
    return instance('Slot', {'categories': set(categories)})


class Resource(object):

    def __call__(self):
        return self

    def dyn(self, name):
        return self

    def exists(self):
        return False


class TerrainArea(object):
    # RU 1.45 BigWorld.PyTerrainSelectedArea as CombatSelectedArea sets it up.

    def setup(self, visual, size, height, color):
        self.args = (visual, size, height, color)

    def enableAccurateCollision(self, value):
        pass

    def setCutOffDistance(self, value):
        pass


class Node(object):

    def __init__(self):
        self.items = []

    def attach(self, item):
        self.items.append(item)


class Model(object):

    def __init__(self, path):
        self.root = Node()
        self.motors = []

    def node(self, name):
        return self.root

    def addMotor(self, motor):
        self.motors.append(motor)


class DossierStats(object):
    # RU 1.45 gui/shared/gui_items/dossier/stats.py: the random-battle max records of a vehicle dossier.

    def getMaxDamage(self):
        return 2000

    def getMaxAssisted(self):
        return 3000

    def getMaxFrags(self):
        return 4

    def getMaxXp(self):
        return 1100


class GarageDevice(object):

    def __init__(self, name):
        self.name = name
        self.isRemovable = True
        self.intCD = len(name)


class GarageVehicle(object):

    def __init__(self, devices):
        self.invID = 7
        self.intCD = 1
        self.optDevices = instance('OptDevices', {'installed': list(devices)})
        self.crew = []
        self.lastCrew = None
        self.descriptor = instance('Descriptor', {'modifications': [11, 12]})


class GarageItems(object):

    def __init__(self):
        self.vehicle = GarageVehicle([GarageDevice('rammer'), GarageDevice('vents'), None])
        self.free_berths = 0

    def getVehicle(self, inv_id):
        return self.vehicle if inv_id == self.vehicle.invID else None

    def freeTankmenBerthsCount(self):
        return self.free_berths


class GamefaceViewModel(object):

    def __init__(self, properties=0, commands=0):
        self.strings = []
        self.commands = {}
        self._initialize()

    def _initialize(self):
        pass

    def _addStringProperty(self, name, value):
        self.strings.append([name, value])

    def _setString(self, index, value):
        self.strings[index][1] = value

    def _addCommand(self, name):
        self.commands[name] = Event()
        return self.commands[name]


class ViewSettings(object):

    def __init__(self, layout_id, flags=None, model=None):
        self.layout_id = layout_id
        self.model = model


class ViewImpl(object):

    def __init__(self, settings):
        self.settings = settings

    def getViewModel(self):
        return self.settings.model

    def _onLoading(self, *args, **kwargs):
        pass

    def _finalize(self):
        pass


class StatusEvent(list):

    def __iadd__(self, handler):
        self.append(handler)
        return self


def window_impl_class(test):
    """WindowImpl that records the loaded windows in `test.windows`."""

    class WindowImpl(object):

        def __init__(self, wndFlags=None, content=None, layer=None, **kwargs):
            self.content = content
            self.layer = layer
            self.uniqueID = len(test.windows) + 1
            self.windowStatus = 1
            self.isFocused = False
            self.onStatusChanged = StatusEvent()

        def load(self):
            test.windows.append(self)
            self.windowStatus = 3
            self.content._onLoading()

        def destroy(self):
            self.windowStatus = 5
            test.windows.remove(self)
            self.content._finalize()

    return WindowImpl


def chat_classes(test):
    """The battle chat controllers whose lines land in `test.chat`."""

    class BattleLayout(object):

        def addMessage(self, message, doFormatting=True):
            test.chat.append(self._formatMessage(message, doFormatting)[1])
            return True

        def addCommand(self, command):
            test.chat.append('command:%s' % command.getSenderID())

    class ChannelController(BattleLayout):

        def _formatMessage(self, message, doFormatting=True):
            return False, message.text

    class EpicTeamChannelController(ChannelController):
        # RU 1.45 battle_controllers: the Frontline team chat builds its line with its own _formatMessage.

        def _formatMessage(self, message, doFormatting=True):
            return False, u'<epic>' + message.text

    return BattleLayout, ChannelController, EpicTeamChannelController


def hangar_view_classes(test):
    """The lobby Hangar view and the offer banner, recording what reaches them."""

    class Hangar(object):

        def __onTeaserReceived(self, teaserData, showCallback, closeCallback):
            test.teasers.append(teaserData)

        def __updateCarouselEventEntryState(self):
            self.as_updateCarouselEventEntryStateS(True)

        def as_updateCarouselEventEntryStateS(self, visible):
            test.entries.append(visible)

    class OfferBannerWindow(object):

        @classmethod
        def tryLoad(cls, offerID, controller):
            test.banner_loads.append(offerID)

    return Hangar, OfferBannerWindow


def chat_message(sender, text):
    return instance('Message', {'avatarSessionID': sender, 'text': text})


def notification(kind, class_name='Notification'):
    return instance(class_name, {'getType': lambda item: kind})


def stun_info(end_time, duration):
    # RU 1.45 Vehicle.updateStunInfo: STUN carries a StunInfo namedtuple, its end a StunInfo with duration 0.
    return instance('StunInfo', {'endTime': end_time, 'duration': duration})


def comp7_division(rank, index, begin):
    return instance('Division', {
        'rank': rank,
        'index': index,
        'range': instance('Range', {'begin': begin}),
        'elitePercent': 0,
    })


class Game(object):
    """The stubbed client in a throwaway game folder: start() installs it, stop() takes it down."""

    def __init__(self, client_version=CLIENT_VERSION):
        self.client_version = client_version

    def start(self):
        self.saved_cwd = os.getcwd()
        self.saved_stdout = sys.stdout
        sys.stdout = Sink()
        self.game_dir = tempfile.mkdtemp()
        os.chdir(self.game_dir)
        self.saved_appdata = os.environ.get('APPDATA')
        os.environ['APPDATA'] = os.path.join(self.game_dir, 'AppData')
        self.purge()
        self.callbacks = []
        self.messages = []
        self.fetches = []
        self.player = Player()
        self.events = instance('PlayerEvents', {})
        for name in PLAYER_EVENTS:
            setattr(self.events, name, Event())
        self.vehicle = instance('CurrentVehicle', {'item': None, 'onChanged': Event()})
        self.install_stubs()

    def stop(self):
        os.chdir(self.saved_cwd)
        os.environ['APPDATA'] = self.saved_appdata
        sys.stdout = self.saved_stdout
        self.purge()
        shutil.rmtree(self.game_dir, ignore_errors=True)

    def purge(self):
        _support.drop_game_modules(STUBBED)

    def install_big_world(self):
        test = self

        def request(method, url, headers, body, callback):
            def respond(response):
                callback(response.responseCode, response.body, response.headers())

            test.fetches.append((method, url, headers, body, respond))

        self.clock = [100.0]
        module(
            'BigWorld',
            callback=lambda delay, fn: test.callbacks.append(fn),
            player=lambda: test.player,
            serverTime=lambda: SERVER_TIME,
            time=lambda: test.clock[0],
        )
        _support.install_transport(request)

    def install_battle_results_stubs(self):
        self.results_cache = BattleResultsCache()
        self.results_service = instance('BattleResultsService', {})
        self.results_service.onResultPosted = Event()
        self.results_interface = constants('IBattleResultsService', {})
        package('account_helpers')
        cache_module = module(
            'account_helpers.BattleResultsCache',
            load=self.results_cache.load,
            convertToFullForm=self.results_cache.convertToFullForm,
        )
        sys.modules['account_helpers'].BattleResultsCache = cache_module

    def install_dependency_stubs(self):
        test = self
        self.services = {self.results_interface: self.results_service}
        services = self.services
        dependency = instance('Dependency', {'instance': staticmethod(lambda interface: services.get(interface))})
        module('helpers', dependency=dependency, getFullClientVersion=lambda: test.client_version)
        package('skeletons')
        package('skeletons.gui')
        module('skeletons.gui.battle_results', IBattleResultsService=self.results_interface)

    def install_system_messages(self):
        test = self
        self.result_messages = []
        package('gui')
        system_messages = module(
            'gui.SystemMessages',
            SM_TYPE=constants('SM_TYPE', {'Information': 'info'}),
            pushMessage=lambda text, type=None: test.messages.append(text),
            pushMessagesFromResult=lambda outcome: test.result_messages.append(outcome.userMsg),
        )
        sys.modules['gui'].SystemMessages = system_messages

    def install_stubs(self):
        self.install_big_world()
        module('BattleReplay', isPlaying=lambda: False)
        module('CurrentVehicle', g_currentVehicle=self.vehicle)
        module('PlayerEvents', g_playerEvents=self.events)
        module('BattleFeedbackCommon', BATTLE_EVENT_TYPE=KINDS)
        package('dossiers2')
        package('dossiers2.ui')
        module('dossiers2.ui.achievements', ACHIEVEMENT_BLOCK=constants('ACHIEVEMENT_BLOCK', {'TOTAL': 'total'}))
        self.install_battle_results_stubs()
        self.install_dependency_stubs()
        self.install_system_messages()
        entry_dirs = [os.path.join(base, 'entry') for base in _support.source_dirs()]
        package('gui.mods', [path for path in entry_dirs if os.path.isdir(path)])
        package('gui.mods.otmetki', [_support.PACKAGES_DIR, _support.MODPACK_DIR])

    def install_hud_stubs(self, inject=True, **scaleform):
        test = self
        self.sounds = []
        self.install_gameface_hud_stubs()
        if inject:
            self.install_scaleform(**scaleform)
        package('gui.battle_control')
        view_states = {name: value for name, value in VIEW_STATE.items() if name != 'STUN'}
        module(
            'gui.battle_control.battle_constants',
            FEEDBACK_EVENT_ID=constants('FEEDBACK_EVENT_ID', FEEDBACK_IDS),
            VEHICLE_VIEW_STATE=constants('VEHICLE_VIEW_STATE', view_states),
        )
        module('constants', ARENA_PERIOD=constants('ARENA_PERIOD', ARENA_PERIODS))
        sounds = instance('Sounds', {
            'playSound2D': lambda sounds, name: test.sounds.append(name),
            'getSound2D': lambda sounds, name: test.sounds.append(name),
        })
        module('SoundGroups', g_instance=sounds)

    def install_hotkey_input(self, **keys):
        self.key_down = Event()
        module('Keys', **keys)
        input_handler = instance('Input', {'onKeyDown': self.key_down})
        sys.modules['gui'].InputHandler = constants('InputHandler', {'g_instance': input_handler})
        sys.modules['BigWorld'].isKeyDown = lambda key: True

    def install_avatar_and_device_stubs(self):
        self.install_hotkey_input(
            KEY_H=STREAMER_KEY,
            KEY_LCONTROL=LEFT_CONTROL,
            KEY_LSHIFT=LEFT_SHIFT,
            KEY_RCONTROL=RIGHT_CONTROL,
            KEY_RSHIFT=RIGHT_SHIFT,
        )

        impl = sys.modules.get('gui.impl') or package('gui.impl')
        impl.backport = module('gui.impl.backport', text=lambda resource: None)
        strings = instance('Strings', {'artefacts': Resource()})
        module('gui.impl.gen', R=constants('R', {'strings': strings}))
        self.own_devices = [
            (Device('rammer', ['firepower']), device_slot('firepower')),
            (Device('vents', ['survivability'], True), device_slot('mobility')),
            (None, device_slot('firepower')),
        ]

    def install_failing_vehicle_builder(self):
        # RU 1.45 gui/battle_control/gui_vehicle_builder.VehicleBuilder: getResult builds the GUI Vehicle, which a
        # client can refuse (Vehicle.__init__ raised KeyError 'customRoleSlotTypeId' before the role slot was set).
        calls = []

        class VehicleBuilder(object):

            def __getattr__(self, name):
                return lambda *args: calls.append((name,) + args)

            def getResult(self):
                raise KeyError('customRoleSlotTypeId')

        module('gui.battle_control.gui_vehicle_builder', VehicleBuilder=VehicleBuilder)
        own_vehicle = instance('OwnVehicle', {
            'typeDescriptor': public_descriptor(1),
            'setups': {'shellsSetups': [], 'eqsSetups': [], 'boostersSetups': [], 'devicesSetups': []},
            'setupsIndexes': {},
            'crewCompactDescrs': [],
            'customRoleSlotTypeId': ROLE_SLOT,
            'vehPostProgression': [],
            'disabledSwitches': [],
        })
        sys.modules['BigWorld'].entity = lambda vehicle_id: own_vehicle if vehicle_id == OWN_VEHICLE else None
        return calls

    def install_setup_vehicle_builder(self, setup_devices):
        # RU 1.45 PrebattleSetupsController.__updateGuiVehicle: the GUI vehicle of the own setups installs its setup's
        # device sequence (optDevices.installed.getIntCDs(), 0 for an empty slot) into its descriptor; the arena's
        # descriptor may still hold another setup.
        by_cd = {device.compactDescr: device for device, _ in setup_devices if device is not None}
        slots = [slot for _, slot in setup_devices]
        installed = {'sequence': []}

        def install(descriptor, sequence):
            installed['sequence'] = list(sequence)

        def iterate(descriptor):
            return iter([(by_cd.get(cd), slot) for cd, slot in zip(installed['sequence'], slots)])

        intcds = [device.compactDescr if device is not None else 0 for device, _ in setup_devices]
        gui_vehicle = instance('GuiVehicle', {
            'descriptor': instance('Descriptor', {'installOptDevsSequence': install, 'iterOptDevsWithSlots': iterate}),
            'optDevices': instance('OptDevices', {'installed': instance('Installed', {
                'getIntCDs': lambda layout: list(intcds),
                'getItems': lambda layout: [],
            })}),
            'battleBoosters': instance('Boosters', {'installed': instance('BoosterSlots', {
                '__iter__': lambda layout: iter([None]),
                'getItems': lambda layout: [],
            })}),
        })

        class VehicleBuilder(object):

            def __getattr__(self, name):
                return lambda *args: None

            def getResult(self):
                return gui_vehicle

        module('gui.battle_control.gui_vehicle_builder', VehicleBuilder=VehicleBuilder)
        own_vehicle = instance('OwnVehicle', {
            'typeDescriptor': public_descriptor(1),
            'setups': {'shellsSetups': [], 'eqsSetups': [], 'boostersSetups': [], 'devicesSetups': []},
            'setupsIndexes': {},
            'crewCompactDescrs': [],
            'customRoleSlotTypeId': ROLE_SLOT,
            'vehPostProgression': [],
            'disabledSwitches': [],
        })
        sys.modules['BigWorld'].entity = lambda vehicle_id: own_vehicle if vehicle_id == OWN_VEHICLE else None

    def install_shot_and_bush_circle_stubs(self):
        test = self
        self.shots = []
        self.install_hotkey_input(KEY_B=BUSH_CIRCLE_KEY, KEY_LCONTROL=LEFT_CONTROL, KEY_LSHIFT=LEFT_SHIFT)

        class Vehicle(object):
            # RU 1.45 Vehicle.Vehicle: the client draws the effects of every shot on a vehicle through
            # showDamageFromShot.

            def __init__(self, own):
                self.isPlayerVehicle = own
                self.matrix = 'own-matrix' if own else 'other-matrix'

            def showDamageFromShot(self, attacker_id, points, effects_index, damage_factor, last_material_is_shield):
                test.shots.append(attacker_id)

        big_world = sys.modules['BigWorld']
        big_world.Model = Model
        big_world.PyTerrainSelectedArea = TerrainArea
        big_world.Servo = lambda matrix: ('servo', matrix)
        self.own_vehicle = Vehicle(True)
        big_world.entity = lambda vehicle_id: self.own_vehicle if vehicle_id == OWN_VEHICLE else None
        module('Math', Vector2=lambda x, y: (x, y))
        module('Vehicle', Vehicle=Vehicle)
        return Vehicle

    def install_client_class_stubs(self):
        self.chat = []
        self.notifications = []
        test = self
        battle_layout, channel_controller, epic_controller = chat_classes(self)

        class NotificationsModel(object):

            def addNotification(self, item):
                test.notifications.append(item.getType())

        for name in CHAT_PACKAGES:
            package(name)
        module('messenger.gui.Scaleform.channels.layout', BattleLayout=battle_layout)
        module(
            'messenger.gui.Scaleform.channels.bw_chat2.battle_controllers',
            _ChannelController=channel_controller,
            EpicTeamChannelController=epic_controller,
        )
        module('messenger.ext.player_helpers', isCurrentPlayer=lambda session_id: session_id == 'me')
        module('notification.NotificationsModel', NotificationsModel=NotificationsModel)
        module('notification.settings', NOTIFICATION_TYPE=constants('NOTIFICATION_TYPE', NOTIFICATION_TYPES))
        return channel_controller, NotificationsModel

    def install_site_vehicle(self):
        dossier = instance('Dossier', {'getRandomStats': lambda item: DossierStats()})
        self.vehicle.item = instance('Vehicle', {'intCD': 1, 'name': 'ussr:R04_T-34', 'level': 5, 'crew': []})
        self.vehicle.getDossier = lambda: dossier

    def install_customization_stubs(self):
        test = self
        self.outfits = []

        class OutfitApplier(object):

            def __init__(self, vehicle, outfit_data):
                self.vehicle = vehicle
                self.outfit_data = outfit_data

            # RU 1.45 Processor.request is @adisp_async: request() returns the caller that takes the callback.
            def request(self):
                def caller(callback):
                    test.outfits.append(self.outfit_data)
                    callback(result(True, 'style removed'))
                return caller

        module('gui.shared.gui_items.processors.common', OutfitApplier=OutfitApplier)
        package('items.components')
        module('items.components.c11n_constants', SeasonType=constants('SeasonType', {'ALL': 7}))
        module('items.customizations', CustomizationOutfit=lambda: 'empty-component')
        package('vehicle_outfit')
        module('vehicle_outfit.outfit', Outfit=lambda component=None, vehicleCD=None: ('outfit', component, vehicleCD))

    def install_garage_stubs(self):
        test = self
        self.processors = []

        class InstallerProcessor(object):

            def __init__(self, vehicle, item, slotIdx, install=True):
                self.vehicle = vehicle
                self.item = item
                self.slot = slotIdx
                self.install = install

            # RU 1.45 Processor.request is @adisp_async: request() returns the caller that takes the callback.
            def request(self):
                return lambda callback: test.processors.append((self, callback))

        self.items = GarageItems()
        items_cache = constants('IItemsCache', {})
        self.services[items_cache] = instance('ItemsCache', {'items': self.items})
        package('skeletons.gui.shared')
        sys.modules['skeletons.gui.shared'].IItemsCache = items_cache
        for name in ('gui.shared', 'gui.shared.gui_items', 'gui.shared.gui_items.processors'):
            package(name)
        module('gui.shared.gui_items.processors.module', getInstallerProcessor=InstallerProcessor)
        modifications = {
            11: instance('Modification', {'name': 'mod_a'}),
            12: instance('Modification', {'name': 'mod_b'}),
        }
        post_progression = instance('PostProgression', {'modifications': modifications})
        cache = instance('Cache', {'postProgression': lambda cache: post_progression})
        package('items').vehicles = module('items.vehicles', g_cache=cache)
        self.vehicle.item = self.items.vehicle

    def install_hangar_view_stubs(self):
        self.teasers = []
        self.entries = []
        self.banner_loads = []
        hangar_class, banner_class = hangar_view_classes(self)
        for name in HANGAR_VIEW_PACKAGES:
            package(name)
        module('gui.Scaleform.daapi.view.lobby.hangar.Hangar', Hangar=hangar_class)
        module('gui.impl.lobby.offers.offer_banner_window', OfferBannerWindow=banner_class)
        return hangar_class, banner_class

    def install_gameface_hud_stubs(self):
        test = self
        self.windows = []
        self.res_id = 7
        package('frameworks')
        module(
            'frameworks.wulf',
            ViewModel=GamefaceViewModel,
            ViewSettings=ViewSettings,
            ViewFlags=constants('ViewFlags', {'VIEW': 1}),
            WindowFlags=constants('WindowFlags', {'WINDOW': 1}),
            WindowLayer=constants('WindowLayer', {'WINDOW': 7}),
            WindowStatus=constants('WindowStatus', {'LOADED': 3, 'DESTROYING': 4, 'DESTROYED': 5}),
            Window=type('Window', (object,), {'_cFocusChanged': lambda window, focused: None}),
        )
        package('gui.impl')
        module('gui.impl.pub', ViewImpl=ViewImpl, WindowImpl=window_impl_class(self))
        module(
            'openwg_gameface',
            res_id_by_key=lambda key: test.res_id if key == 'otmetki/ui/hud' else -1,
            ModDynAccessor=lambda key: (lambda: 'layout:' + key),
            gf_mod_inject=lambda model, key, styles=None, modules=None: None,
        )

    def install_app_loader(self):
        loader = instance('AppLoader', {'space': GUI_SPACES['LOGIN']})
        loader.getSpaceID = lambda: loader.space
        loader.onGUISpaceEntered = Event()
        loader.onGUISpaceLeft = Event()
        interface = constants('IAppLoader', {})
        self.services[interface] = loader
        package('skeletons.gui')
        module(
            'skeletons.gui.app_loader',
            GuiGlobalSpaceID=constants('GuiGlobalSpaceID', GUI_SPACES),
            IAppLoader=interface,
        )
        return loader

    def install_onslaught_services(self):
        current = comp7_division(5, 2, 3000)
        divisions = (comp7_division(5, 3, 2500), current, comp7_division(5, 1, 3500))
        comp7 = constants('IComp7Controller', {})
        lobby = constants('ILobbyContext', {})
        skill = instance('Equipment', {'userString': u'Точка сбора'})
        self.services[comp7] = instance('Comp7', {
            'rating': 3150,
            'isComp7PrbActive': lambda ctrl: True,
            'isQualificationActive': lambda ctrl: False,
            'getVehicleSkillEquipment': lambda ctrl, vehicle: skill,
        })
        ranks = instance('Ranks', {'divisions': divisions})
        server_settings = instance('Settings', {'comp7RanksConfig': ranks})
        self.services[lobby] = instance('Lobby', {'getServerSettings': lambda ctx: server_settings})
        module('skeletons.gui.lobby_context', ILobbyContext=lobby)
        for name in ('gui.impl', 'gui.impl.lobby', 'gui.impl.lobby.comp7'):
            package(name)
        module('gui.impl.lobby.comp7.comp7_shared', getPlayerDivision=lambda: current)
        return comp7

    def install_event_services(self):
        shop = constants('IShopSalesEventController', {})
        items = constants('IItemsCache', {})
        boards = constants('IEventBoardController', {})
        self.services[shop] = instance('Shop', {
            'isShopSalesEntryPointAvailable': lambda ctrl: True,
            'activePhaseFinishTime': 0,
            'eventFinishTime': 4102444800,
        })
        stats = instance('Stats', {'entitlements': {'caravan_guaranteed_reward_points': 12}})
        self.services[items] = instance('Items', {'items': instance('Cache', {'stats': stats})})
        event = instance('Event', {
            'getObjectiveParameter': lambda e: 'originalXP',
            'isStarted': lambda e: True,
            'isFinished': lambda e: False,
            'getName': lambda e: u'Триатлон',
            'getCardinality': lambda e: 3,
            'getStartDateTs': lambda e: 0,
            'getEndDateTs': lambda e: 4102444800,
            'getLimits': lambda e: None,
        })
        events_data = instance('Data', {'getEvents': lambda data: [event]})
        self.services[boards] = instance('Boards', {'getEventsSettingsData': lambda ctrl: events_data})
        module('skeletons.gui.shared', IItemsCache=items)
        module('skeletons.gui.event_boards_controllers', IEventBoardController=boards)
        return shop

    def load(self, entries):
        for name in entries:
            importlib.import_module('gui.mods.' + name)
        app = sys.modules['gui.mods.otmetki.companion.app.client'].g_app
        app.config.update({feature: True for feature in BATTLE_OPT_INS})
        return app

    def bind(self, app):
        app.credentials.save(Credentials('device-1', 's' * 40, ACCOUNT))

    def open_hangar(self, entries=ENTRY_MODULES, is_bound=False):
        app = self.load(list(entries))
        if is_bound:
            self.bind(app)
        self.player = Player(ACCOUNT)
        self.events.onAccountShowGUI()
        return app

    def load_shuffled(self, seed):
        entries = list(ENTRY_MODULES)
        random.Random(seed).shuffle(entries)
        return self.load(entries), entries

    def play_battle(self, app):
        self.bind(app)
        self.player = Player(ACCOUNT)
        self.events.onAccountShowGUI()
        results = _support.battle_results()
        self.player = Player(ACCOUNT, results['arenaUniqueID'])
        self.events.onAvatarReady()
        self.events.onAvatarBecomeNonPlayer()
        self.events.onBattleResultsReceived(True, results)
        return results

    def enter_battle(self, results_arena, tank_id=None, gui_type=None):
        session = BattleSession()
        if gui_type is not None:
            session.arena.guiType = gui_type
        self.player = Player(ACCOUNT, results_arena)
        if tank_id is not None:
            self.player.vehicleTypeDescriptor = public_descriptor(tank_id)
            if not getattr(self, 'own_vehicle_listed_late', False):
                self.list_own_vehicle(session, tank_id)
        self.join(session)
        return session

    def list_own_vehicle(self, session, tank_id):
        # RU 1.45 ClientArena: the arena's vehicle list carries the own vehicle's full descriptor, the one the stock
        # OptionalDevicesController reads the equipment from.
        devices = getattr(self, 'own_devices', ())
        session.arena.vehicles[OWN_VEHICLE] = {'vehicleType': instance('Descriptor', {
            'type': instance('VehicleType', {'compactDescr': tank_id}),
            'iterOptDevsWithSlots': lambda descriptor: iter(devices),
            'makeCompactDescr': lambda descriptor: 'own-compact-descr',
        })}

    def enter_battle_with_gun(self, yaw_limits):
        session = BattleSession()
        self.player = Player(ACCOUNT, 4242)
        gun = instance('Gun', {'turretYawLimits': yaw_limits})
        self.player.vehicleTypeDescriptor = instance('Descriptor', {'gun': gun})
        self.player.gunRotator = instance('GunRotator', {'turretYaw': 0.0})
        self.join(session)
        return session

    def join(self, session):
        self.player.guiSessionProvider = session
        self.player.playerVehicleID = OWN_VEHICLE
        self.player.team = 1
        self.player.arena = session.arena
        self.events.onAvatarReady()

    def back_to_hangar(self):
        self.events.onAvatarBecomeNonPlayer()
        self.player = Player(ACCOUNT)
        self.events.onAccountShowGUI()

    def leave_battle_early(self, app):
        self.bind(app)
        self.player = Player(ACCOUNT)
        self.events.onAccountShowGUI()
        results = _support.battle_results()
        self.player = Player(ACCOUNT, results['arenaUniqueID'])
        self.player.battleResultsCache = self.results_cache
        self.events.onAvatarReady()
        self.events.onAvatarBecomeNonPlayer()
        self.player = Player(ACCOUNT)
        self.player.battleResultsCache = self.results_cache
        self.events.onAccountShowGUI()
        return results

    def registry(self):
        return sys.modules['gui.mods.otmetki.core.registry'].registry()

    def instances(self):
        return self.registry().instances

    def hud_module(self):
        return sys.modules['gui.mods.otmetki.core.client.hud']

    def hud_backend(self):
        hud = sys.modules.get('gui.mods.otmetki.core.client.hud')
        return hud._state['backend'] if hud is not None else None

    @property
    def components(self):
        """The labels on the Gameface HUD page's surface, each with the GUI space it belongs to."""
        backend = self.hud_backend()
        if backend is None:
            return {}
        labels = backend.surface.labels
        return {alias: dict(label['props'], space=label['space']) for alias, label in labels.items()}

    def drag(self, alias, x, y):
        self.hud_backend().on_message(json.dumps({'type': 'moved', 'id': alias, 'x': x, 'y': y}))

    def hud_components(self):
        hud = [(alias, props) for alias, props in self.components.items() if alias.startswith('otmetki.hud.')]
        return {alias.split('.')[-1]: props for alias, props in hud}

    def hud_text(self, panel):
        return self.hud_components()[panel]['text']

    def saved_components(self, app):
        """components.json once the saves held back for a second (core.client.storage) are written."""
        sys.modules['gui.mods.otmetki.core.client.storage'].flush_writes()
        return _support.load_json(os.path.join(app.config_dir, 'components.json'))

    def battle_events(self, app):
        return [event for event in app.outbox.events if event.get('type') == 'battle_result']

    def messages_with(self, *parts):
        return [text for text in self.messages if all(part in text for part in parts)]

    def fetches_to(self, suffix):
        return [fetch for fetch in self.fetches if fetch[1].endswith(suffix)]

    def ingest_fetches(self):
        return [fetch for fetch in self.fetches if fetch[0] == 'POST' and fetch[1].endswith('/mod/ingest')]

    def answer(self, name, data):
        for method, url, headers, body, callback in list(self.fetches):
            if method == 'POST' and url.endswith('/mod/me/' + name):
                self.fetches.remove((method, url, headers, body, callback))
                callback(response_json(data))

    def hud_page(self):
        """The state of the HUD page on the screen: the HUD window's in battle, inside the hangar view else."""
        if hasattr(self.player, 'arena'):
            self.next_frame_pushes()
            return json.loads(self.windows[-1].content.getViewModel().strings[0][1])
        return self.injected_page(self.scaleform.lobby.containerManager.views['hangar'])

    def hud_page_ids(self):
        return [panel['id'] for panel in self.hud_page()['panels']]

    def next_frame_pushes(self):
        """Run the HUD page pushes the Gameface backend put off to the next frame (core.hud.surface.FramePush)."""
        pushes = [callback for callback in self.callbacks if getattr(callback, '__name__', None) == 'flush']
        self.callbacks[:] = [callback for callback in self.callbacks if callback not in pushes]
        for push in pushes:
            push()

    def run_callbacks(self):
        pending = list(self.callbacks)
        del self.callbacks[:]
        for callback in pending:
            callback()

    def install_scaleform(self, **options):
        self.scaleform = _scaleform.Scaleform(**options).install()
        loader = self.install_app_loader()
        self.loader = loader
        loader.getApp = self.scaleform.app_loader.getApp
        loader.getDefBattleApp = self.scaleform.app_loader.getDefBattleApp
        return loader

    def open_inject_lobby(self, **options):
        """The lobby with the stubbed Scaleform side of the inject host, before the hangar view is loaded."""
        self.install_hud_stubs(**options)
        app = self.load(list(ENTRY_MODULES))
        self.player = Player(ACCOUNT)
        self.events.onAccountShowGUI()
        self.run_callbacks()
        return app

    def load_hangar(self):
        return self.scaleform.load_view(self.scaleform.lobby, 'hangar')

    def enter_space(self, space_name):
        self.loader.onGUISpaceLeft(self.loader.space)
        self.loader.space = GUI_SPACES[space_name]
        self.loader.onGUISpaceEntered(self.loader.space)

    def enter_window_battle(self):
        """The battle GUI space entered and settled (the HUD window opens a frame later), then the battle itself."""
        self.enter_space('BATTLE')
        session = self.enter_battle(1)
        self.run_callbacks()
        return session

    def load_battle_page(self):
        return self.scaleform.load_battle_page(components=STOCK_COMPONENTS)

    def send_from_page(self, view, alias, **message):
        self.scaleform.page(view, alias).getViewModel().send({'message': json.dumps(message)})

    def send_from_window(self, **message):
        self.windows[-1].content.getViewModel().commands['send']({'message': json.dumps(message)})

    def set_battle_cursor(self, shown):
        self.hud_backend()._set_cursor(shown)

    def injected_page(self, view, alias=INJECT_ALIAS):
        self.next_frame_pushes()
        page = self.scaleform.page(view, alias)
        return json.loads(page.getViewModel().strings[0][1])

    def set_edit_modifier(self, held):
        modifier = self.hud_backend().modifier
        modifier.held = held
        modifier.on_change(held)

    def moe_curve_reads(self, app):
        snapshot = dict(MOE_SNAPSHOT)
        app.marks.hangar_moe[1] = snapshot
        app.bus.emit('vehicle_moe', snapshot)
        return [callback for method, url, headers, body, callback in self.fetches
                if method == 'GET' and url.endswith('/v1/moe/1')]

    def answer_moe_curve(self, app):
        self.moe_curve_reads(app)[0](response_json(MOE_CURVE))

    def press(self, key):
        self.key_down(key_event(key))


class StoryTest(unittest.TestCase):
    """One game per class: setUpClass plays the class's story once and keeps what its tests check, so the
    modpack loads once per story rather than once per test."""
    client_version = CLIENT_VERSION

    @classmethod
    def setUpClass(cls):
        game = Game(cls.client_version)
        game.start()
        try:
            cls.play(game)
        finally:
            game.stop()

    @classmethod
    def play(cls, game):
        raise NotImplementedError


class LoadOrderTest(StoryTest):

    @classmethod
    def setUpClass(cls):
        cls.orders = []
        for seed in LOAD_ORDER_SEEDS:
            game = Game()
            game.start()
            try:
                cls.orders.append(cls.play_order(game, seed))
            finally:
                game.stop()

    @classmethod
    def play_order(cls, game, seed):
        app, entries = game.load_shuffled(seed)
        registry = game.registry()
        order = {
            'entries': entries,
            'is_host': registry.host is app,
            'instances': sorted(registry.instances),
        }
        results = game.play_battle(app)
        order['arena_id'] = results['arenaUniqueID']
        order['battles'] = copy.deepcopy(game.battle_events(app))
        order['state'] = app.state_file.read({})
        order['session_messages'] = game.messages_with(u'Сессия') + game.messages_with(u'Session')
        order['messages'] = list(game.messages)
        return order

    def test_every_load_order_registers_every_feature_under_the_app(self):
        for order in self.orders:
            self.assertTrue(order['is_host'], order['entries'])
            self.assertEqual(order['instances'], sorted(REGISTERED), order['entries'])

    def test_every_load_order_reports_one_battle_with_its_session(self):
        for order in self.orders:
            battle = order['battles']
            state = order['state']
            self.assertEqual(len(battle), 1, order['entries'])
            self.assertTrue(battle[0]['session_id'], order['entries'])
            self.assertEqual(state['seen_arenas'], [order['arena_id']])
            self.assertEqual(account_part(state, 'session')['totals']['battles'], 1)
            self.assertEqual(account_part(state, 'session')['session_id'], battle[0]['session_id'])

    def test_every_load_order_shows_the_session_message(self):
        for order in self.orders:
            self.assertTrue(order['session_messages'], (order['entries'], order['messages']))


class CompanionAloneTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.load(['mod_otmetki'])
        cls.instances = dict(game.instances())
        cls.capture = app.capture
        game.play_battle(app)
        cls.battles = copy.deepcopy(game.battle_events(app))
        cls.state = app.state_file.read({})
        cls.tls_status, cls.tls_expected = cls.status_without_tls(app)

    @staticmethod
    def status_without_tls(app):
        tls = sys.modules[sys.modules[type(app).__module__].tls_available.__module__]
        saved = dict(tls._cache)
        tls._cache['context'] = None
        try:
            return app.status_text(), app.translate('status_tls_unavailable')
        finally:
            tls._cache.clear()
            tls._cache.update(saved)

    def test_a_client_without_tls_says_so_in_the_status(self):
        self.assertEqual(self.tls_status, self.tls_expected)

    def test_a_release_install_has_no_preview_capture(self):
        self.assertIsNone(self.capture)

    def test_the_companion_alone_registers_no_feature(self):
        self.assertEqual(self.instances, {})

    def test_the_companion_alone_reports_the_battle_without_a_session(self):
        self.assertEqual(len(self.battles), 1)
        self.assertIsNone(self.battles[0]['session_id'])
        self.assertNotIn('session', self.state)


class DevPreviewCaptureTest(StoryTest):

    @classmethod
    def play(cls, game):
        dev_folder = os.path.join(game.game_dir, 'mods', '1.45.0.0', 'otmetki-dev')
        os.makedirs(dev_folder)
        with open(os.path.join(dev_folder, 'otmetki-dev.json'), 'w') as handle:
            handle.write('{}')
        game.install_hotkey_input(
            KEY_F12=CAPTURE_SHOT_KEY,
            KEY_F11=CAPTURE_NEXT_KEY,
            KEY_LCONTROL=LEFT_CONTROL,
            KEY_LSHIFT=LEFT_SHIFT,
            KEY_RCONTROL=RIGHT_CONTROL,
            KEY_RSHIFT=RIGHT_SHIFT,
        )
        cls.shots = []
        sys.modules['BigWorld'].screenShot = lambda extension, name: cls.shots.append((extension, name))
        app = game.open_hangar(['mod_otmetki', 'mod_otmetki_minimap', 'mod_otmetki_camera'])
        cls.is_on = app.capture is not None
        game.press(CAPTURE_SHOT_KEY)
        game.press(CAPTURE_NEXT_KEY)
        game.press(CAPTURE_SHOT_KEY)
        cls.notes = [text for text in game.messages if 'minimap' in text]

    def test_a_dev_install_has_the_preview_capture(self):
        self.assertTrue(self.is_on)

    def test_the_shots_are_named_after_the_chosen_component(self):
        self.assertEqual(self.shots, [
            ('png', 'screenshots/otmetki_camera'),
            ('png', 'screenshots/otmetki_minimap'),
        ])

    def test_picking_the_next_component_says_which_one(self):
        self.assertEqual(len(self.notes), 1)


class BattleHudTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        hud = game.hud_module()
        hud.hud_layer(app).update_settings('sixth_sense', {'pulse': False})
        app.marks.hangar_moe[1] = dict(HANGAR_MOE)
        results = _support.battle_results()
        session = game.enter_battle(results['arenaUniqueID'])
        app.marks.battle_started(results['arenaUniqueID'], 1)
        cls.fight(session)
        cls.panels = copy.deepcopy(game.hud_components())
        cls.sounds = list(game.sounds)

        session.feedback.onPlayerSummaryFeedbackReceived(Summary())
        cls.damage_log_after_summary = game.hud_text('damage_log')
        session.state('OBSERVED_BY_ENEMY', False)
        cls.panels_unspotted = sorted(game.hud_components())
        game.drag('otmetki.hud.damage_log', 111, 222)
        cls.saved = game.saved_components(app)

        game.events.onAvatarBecomeNonPlayer()
        cls.panels_after_battle = game.hud_components()
        game.player = Player(ACCOUNT)
        game.events.onAccountShowGUI()
        game.events.onBattleResultsReceived(True, results)
        cls.battle_report = copy.deepcopy(game.battle_events(app)[-1])
        cls.moe_messages = game.messages_with(u'87.00%')
        cls.messages = list(game.messages)

    @staticmethod
    def fight(session):
        """Own and ally damage, hits taken, fire, the ammo rack, the lamp and a kill."""
        session.hit('VEHICLE_ARMOR_PIERCED', ENEMY_VEHICLE)
        session.own_feedback(
            Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)),
            Feedback(KINDS.DAMAGE, ALLY_VEHICLE, Extra(50)),
            Feedback(KINDS.RADIO_ASSIST, ENEMY_VEHICLE, Extra(120)),
            Feedback(KINDS.TANKING, ENEMY_VEHICLE, Extra(240)),
            Feedback(KINDS.RECEIVED_DAMAGE, ENEMY_VEHICLE, Extra(310, 'HOLLOW_CHARGE')),
        )
        session.hit('VEHICLE_HEALTH', ENEMY_VEHICLE, (510, None, 0))
        session.hit('VEHICLE_RICOCHET', ENEMY_VEHICLE)
        session.state('HEALTH', 690)
        session.state('FIRE', True)
        session.state('DEVICES', ('ammoBay', 'critical', 'critical'))
        session.state('DEVICES', ('engine', 'repaired', 'critical'))
        session.state('OBSERVED_BY_ENEMY', True)
        session.arena.onVehicleKilled(ALLY_VEHICLE, ENEMY_VEHICLE, 0, 0, 1)

    def test_battle_hud_shows_the_battle_panels(self):
        self.assertEqual(sorted(self.panels), BATTLE_PANELS)

    def test_battle_hud_labels_are_draggable_except_team_hp(self):
        for name, props in self.panels.items():
            self.assertEqual(props['drag'], name != 'team_hp', name)

    def test_damage_log_lists_own_and_received_damage_but_not_ally_hits(self):
        damage_log = self.panels['damage_log']['text']

        self.assertIn('390', damage_log)
        self.assertIn('310', damage_log)
        self.assertNotIn(' 50 ', damage_log)

    def test_damage_log_takes_the_total_from_the_battle_summary(self):
        self.assertIn('2 150', self.damage_log_after_summary)

    def test_damage_log_names_the_target_of_the_own_shot(self):
        self.assertIn('Pz. IV', self.panels['damage_log']['text'])

    def test_team_hp_shows_the_score_between_the_teams(self):
        team_hp = self.panels['team_hp']['text']

        self.assertIn('0 : 1', team_hp)

    def test_the_mod_plays_no_sound_of_its_own_in_battle(self):
        self.assertEqual(self.sounds, [])

    def test_the_lamp_goes_out_when_the_tank_is_no_longer_spotted(self):
        self.assertNotIn('sixth_sense', self.panels_unspotted)

    def test_a_dragged_panel_saves_its_place_beside_its_settings(self):
        self.assertEqual(self.saved['damage_log']['x'], 111)
        self.assertEqual(self.saved['damage_log']['y'], 222)
        self.assertFalse(self.saved['sixth_sense']['pulse'])

    def test_leaving_the_battle_removes_every_panel(self):
        self.assertEqual(self.panels_after_battle, {})

    def test_the_battle_report_carries_only_the_own_shot(self):
        self.assertEqual(self.battle_report['shots'], [OWN_SHOT])

    def test_the_battle_message_shows_the_moe_progress_and_the_damage(self):
        self.assertTrue(self.moe_messages, self.messages)
        self.assertIn('+1.00%', self.moe_messages[0])
        self.assertIn('2 150', self.moe_messages[0])


class BattleCardsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        app.marks.hangar_moe[1] = dict(HANGAR_MOE)
        session = game.enter_battle(NEXT_ARENA, tank_id=1)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        session.arena.onVehicleKilled(OWN_VEHICLE, ENEMY_VEHICLE, 0, 0, 1)
        session.arena.onPeriodChange(ARENA_PERIODS['AFTERBATTLE'], 0, 0, (2, 1))
        cls.panels_after_end = sorted(game.hud_components())

        game.events.onBattleResultsReceived(True, _support.battle_results())
        cls.last_battle = game.hud_components()['last_battle']
        game.run_callbacks()
        cls.panels_after_show = sorted(game.hud_components())
        game.back_to_hangar()
        cls.panels_after_battle = sorted(game.hud_components())

    def test_no_card_counts_the_battle_being_played(self):
        self.assertNotIn('battle_summary', self.panels_after_end)

    def test_the_previous_battle_s_results_show_in_the_next_battle_by_themselves(self):
        self.assertIn(u'Прошлый бой', self.last_battle['text'])

    def test_the_previous_battle_card_hides_by_itself(self):
        self.assertNotIn('last_battle', self.panels_after_show)

    def test_leaving_the_battle_removes_the_card(self):
        self.assertNotIn('last_battle', self.panels_after_battle)


class HudSwitchedOffTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.load(list(ENTRY_MODULES))
        app.config.update({key: False for key in HUD_OFF})
        game.enter_battle(1)
        cls.panels = game.hud_components()

    def test_battle_hud_switched_off_shows_nothing(self):
        self.assertEqual(self.panels, {})


class EventBattleTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar()
        results = _support.battle_results()
        session = game.enter_battle(results['arenaUniqueID'], gui_type=301)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.event_panels = sorted(game.hud_components())
        game.drag('otmetki.hud.damage_log', 333, 44)
        cls.saved = game.saved_components(app)
        game.events.onAvatarBecomeNonPlayer()
        session = game.enter_battle(results['arenaUniqueID'] + 1, gui_type=30)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.random_panels = copy.deepcopy(game.hud_components())

    def test_event_battles_get_the_compact_layout(self):
        self.assertEqual(self.event_panels, ['damage_log'])

    def test_a_panel_moved_in_an_event_battle_keeps_its_place_for_event_battles_only(self):
        self.assertEqual(self.saved['hud_layout_places'], {'event': {'damage_log': {'x': 333, 'y': 44}}})
        self.assertNotEqual(self.saved['damage_log']['x'], 333)

    def test_a_random_battle_after_an_event_battle_gets_the_full_layout_and_places(self):
        self.assertIn('team_hp', self.random_panels)
        self.assertNotEqual(self.random_panels['damage_log']['x'], 333)


class HudEditTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.load(list(ENTRY_MODULES))
        app.config.update({'battle_team_hp': False})
        game.player = Player(ACCOUNT)
        game.events.onAccountShowGUI()
        cls.described = {}

        def collect(panel_id, preview=None, width=None, height=None, enabled=False, widget=None):
            cls.described.update({panel_id: (preview, width, enabled, widget)})

        app.bus.emit('hud_describe', collect)
        app.bus.emit('hud_edit', True)
        cls.previews = copy.deepcopy(game.hud_components())
        app.bus.emit('hud_edit', False)
        cls.panels_after_edit = game.hud_components()
        app.bus.emit('hud_edit', True)
        game.enter_battle(1)
        cls.battle_panels = copy.deepcopy(game.hud_components())

    def test_hud_describe_lists_every_panel_with_its_preview_and_switch(self):
        self.assertEqual(sorted(self.described), DESCRIBED_PANELS)
        self.assertFalse(self.described['team_hp'][2])
        self.assertTrue(self.described['damage_log'][2])
        self.assertIn('390', self.described['damage_log'][0])

    def test_hud_describe_hands_every_panel_s_preview_widget_to_the_settings_window(self):
        kinds = {panel_id: (described[3] or {}).get('kind') for panel_id, described in self.described.items()}

        self.assertEqual(kinds['crosshair'], 'crosshair')
        self.assertEqual(kinds['team_hp'], 'team_hp')

    def test_hud_edit_shows_lobby_previews_of_the_enabled_panels(self):
        self.assertEqual(sorted(self.previews), HUD_EDIT_PREVIEWS)
        for name, props in self.previews.items():
            self.assertEqual(props['space'], 'lobby', name)
        self.assertIn('Pz. IV', self.previews['damage_log']['text'])

    def test_leaving_hud_edit_removes_the_previews(self):
        self.assertEqual(self.panels_after_edit, {})

    def test_a_battle_replaces_the_hud_edit_previews(self):
        self.assertNotIn('390', self.battle_panels.get('damage_log', {}).get('text', ''))
        self.assertNotIn('sixth_sense', self.battle_panels)


class OwnFeedbackTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar()
        session = game.enter_battle(1)
        own = session.dp.getVehicleInfo(OWN_VEHICLE)
        ally = session.dp.getVehicleInfo(ALLY_VEHICLE)
        session.hit('VEHICLE_ARMOR_PIERCED', ENEMY_VEHICLE)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        shots = game.registry().get('damage_log').log.shots
        session.hit('VEHICLE_HEALTH', ENEMY_VEHICLE, (480, ally, 0))
        cls.hp_after_ally_shot = shots.entries[-1]['hp']
        session.hit('VEHICLE_HEALTH', ENEMY_VEHICLE, (510, own, 0))
        cls.hp_after_own_shot = shots.entries[-1]['hp']

        session.control(ALLY_VEHICLE)
        session.own_feedback(Feedback(KINDS.RADIO_ASSIST, ENEMY_VEHICLE, Extra(640)))
        cls.damage_log = game.hud_text('damage_log')
        cls.is_damage_log_on = app.config.get('battle_damage_log')
        # RU 1.45 Avatar.showVehicleDamageInfo: after death DEVICES reports the ally the camera follows, not the
        # own ammo rack.
        damage_log = game.registry().get('damage_log').log
        session.state('DEVICES', ('ammoBay', 'critical', 'critical'))
        cls.ammo_rack_while_following = damage_log.received.ammo_rack_at
        session.control(OWN_VEHICLE)
        session.state('DEVICES', ('ammoBay', 'critical', 'critical'))
        cls.own_ammo_rack = damage_log.received.ammo_rack_at

        known = session.dp.getVehicleInfo
        # RU 1.45 arena_dp.getVehicleInfo: an unknown id gets a blank VehicleArenaInfoVO of team 0.
        session.dp.getVehicleInfo = lambda vehicle_id: known(vehicle_id) or VehicleInfo(vehicle_id, 0, '', 0)
        battle = sys.modules['gui.mods.otmetki.core.client.battle']
        cls.enemy_verdicts = [battle.is_enemy(vehicle_id) for vehicle_id in (ENEMY_VEHICLE, ALLY_VEHICLE, 999, None)]

    def test_damage_log_takes_the_hp_left_only_from_own_shots(self):
        self.assertIsNone(self.hp_after_ally_shot)
        self.assertEqual(self.hp_after_own_shot, 510)

    def test_own_assist_after_death_still_counts(self):
        self.assertIn('640', self.damage_log)
        self.assertTrue(self.is_damage_log_on)

    def test_after_death_the_ammo_rack_of_the_followed_ally_is_ignored(self):
        self.assertIsNone(self.ammo_rack_while_following)

    def test_the_own_ammo_rack_is_logged(self):
        self.assertIsNotNone(self.own_ammo_rack)

    def test_a_vehicle_without_a_team_is_not_an_enemy(self):
        self.assertEqual(self.enemy_verdicts, [True, False, False, False])


class ChatAndNotificationFilterTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        controller_class, model_class = game.install_client_class_stubs()
        app = game.open_hangar()
        model = model_class()
        for kind in (1, 4, 13):
            model.addNotification(notification(kind))
        cls.after_pop_ups = list(game.notifications)
        for decorator in ('IntegratedAuctionStageStartDecorator', 'TradingCaravanRefillDecorator'):
            model.addNotification(notification(19, decorator))
        cls.after_decorators = list(game.notifications)

        game.enter_battle(1)
        chat = controller_class()
        command = instance('Command', {'isSender': lambda item: False, 'getSenderID': lambda item: 'spammer'})
        for _ in range(3):
            chat.addMessage(chat_message('spammer', u'ALL TO BASE'))
            chat.addMessage(chat_message('me', u'ALL TO BASE'))
        for _ in range(6):
            chat.addCommand(command)
        cls.battle_chat = list(game.chat)
        del game.chat[:]
        epic = sys.modules['messenger.gui.Scaleform.channels.bw_chat2.battle_controllers'].EpicTeamChannelController()
        epic.addMessage(chat_message('ally', u'hold A'))
        cls.epic_chat = list(game.chat)

        game.events.onAvatarBecomeNonPlayer()
        del game.chat[:]
        chat.addMessage(chat_message('spammer', u'after battle'))
        cls.chat_after_battle = list(game.chat)
        app.config.update({'hangar_notification_filter': False})
        model.addNotification(notification(4))
        cls.after_filter_off = list(game.notifications)

    def test_notification_filter_drops_the_pop_ups(self):
        self.assertEqual(self.after_pop_ups, [1, 13])

    def test_notification_filter_tells_the_type_19_decorators_apart(self):
        self.assertEqual(self.after_decorators, [1, 13, 19])

    def test_chat_filter_drops_repeated_spam_and_tags_the_kept_lines(self):
        lines = [text for text in self.battle_chat if not text.startswith('command:')]

        self.assertEqual(len(lines), 4)
        for line in lines:
            self.assertIn(u'ALL TO BASE', line)
            self.assertIn('[', line)

    def test_chat_filter_drops_repeated_commands(self):
        commands = [text for text in self.battle_chat if text.startswith('command:')]

        self.assertEqual(len(commands), 4)

    def test_frontline_team_chat_is_tagged_through_its_own_format(self):
        self.assertEqual(len(self.epic_chat), 1)
        self.assertTrue(self.epic_chat[0].endswith(u'<epic>hold A'))
        self.assertIn('[', self.epic_chat[0])

    def test_chat_after_the_battle_is_left_alone(self):
        self.assertEqual(self.chat_after_battle, [u'after battle'])

    def test_notification_filter_switched_off_lets_pop_ups_through(self):
        self.assertEqual(self.after_filter_off, [1, 13, 19, 4])


class HangarCardsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.open_hangar()
        instances = game.instances()
        tank_card = instances['marks_panel'].ui_parts()['hangar_marks']
        cls.actions = {
            feature_id: instances[feature_id].ui_actions()
            for feature_id in ('battle_results', 'auto_resupply')
        }
        cls.actions['hangar_marks'] = tank_card.ui_actions()
        cls.history_rows = tank_card.ui_page()['rows']
        cls.results_rows_before = instances['battle_results'].ui_page()['rows']
        game.events.onBattleResultsReceived(True, _support.battle_results())
        cls.results_rows = copy.deepcopy(instances['battle_results'].ui_page()['rows'])
        cls.resupply_refusal = instances['auto_resupply'].ui_action('apply_selected')
        instances['hangar_info'].render(SERVER_TIME)
        cls.components = sorted(game.components)

    def test_new_features_offer_card_actions(self):
        for feature_id, actions in self.actions.items():
            self.assertTrue(actions, feature_id)

    def test_history_and_results_pages_start_empty(self):
        self.assertEqual(self.history_rows, [])
        self.assertEqual(self.results_rows_before, [])

    def test_the_results_page_lists_the_session_then_the_battle(self):
        self.assertEqual(self.results_rows[0]['id'], 'session')
        self.assertTrue(self.results_rows[1]['details'])

    def test_auto_resupply_refuses_to_apply_without_a_vehicle(self):
        self.assertEqual(self.resupply_refusal['kind'], 'error')

    def test_hangar_info_draws_its_label(self):
        self.assertIn('otmetki.hangar_info', self.components)


class SettingsBroadcastTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar()
        instances = game.instances()
        instances['hangar_info'].render(SERVER_TIME)
        instances['hangar_info'].save_place({'x': 40, 'y': 50})
        capture = Capture()
        sys.stdout = capture
        for component in instances.values():
            settings = getattr(component, 'settings', None)
            if getattr(component, 'component_id', None) and settings is not None:
                app.bus.emit('component_settings', component.component_id, sorted(settings.to_dict()))
        app.bus.emit('hud_reset_layout')
        sys.stdout = Sink()
        cls.output = ''.join(capture.parts)
        cls.components = sorted(game.components)

    def test_settings_changes_and_layout_reset_reach_every_component_without_errors(self):
        self.assertNotIn('error in', self.output)
        self.assertIn('otmetki.hangar_info', self.components)


class SessionSiteReadsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.load(list(ENTRY_MODULES))
        game.bind(app)
        game.player = Player(ACCOUNT)
        game.events.onAccountShowGUI()
        reads = {
            url.rsplit('/', 1)[-1]: (headers, body, callback)
            for method, url, headers, body, callback in game.fetches
            if method == 'POST' and '/mod/me/' in url
        }
        cls.reads = {name: (headers, body) for name, (headers, body, _) in reads.items()}
        reads['overview'][2](response_json(contract_example('ratings-overview.example.json')))
        cls.text = game.components['otmetki.session']['text']
        cls.overview_fetches = len(game.fetches_to('/mod/me/overview'))
        game.enter_battle(1)
        cls.battle_components = sorted(game.components)

    def test_the_session_card_asks_the_site_for_the_own_goals_and_account(self):
        self.assertIn('goals', self.reads)
        self.assertIn('overview', self.reads)
        self.assertEqual(self.overview_fetches, 1)
        for name in ('goals', 'overview'):
            headers, body = self.reads[name]
            self.assertTrue(headers['X-Otmetki-Signature'].startswith('sha256='))
            self.assertEqual(json.loads(body)['account_id'], ACCOUNT)

    def test_the_session_card_shows_the_account_wn8(self):
        self.assertIn(u'WN8 1 850', self.text)

    def test_the_session_card_leaves_with_the_hangar(self):
        self.assertNotIn('otmetki.session', self.battle_components)


class ControllerPanelsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar()
        session = game.enter_battle(1)
        cls.panels = copy.deepcopy(game.hud_components())

        game.hud_module().hud_layer(app).update_settings('battle_progress', {'main_gun_share': True})
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        session.hit('VEHICLE_HEALTH', ENEMY_VEHICLE, (510, None, 0))
        cls.main_gun = game.hud_text('battle_progress')

        game.clock[0] = 200.0
        session.own_feedback(Feedback(KINDS.RECEIVED_DAMAGE, ALLY_VEHICLE, Extra(140, 'HIGH_EXPLOSIVE', reason='ram')))
        cls.rammed = game.hud_text('damage_log')
        game.clock[0] = 201.0
        session.own_feedback(Feedback(KINDS.RECEIVED_DAMAGE, ENEMY_VEHICLE, Extra(300, 'ARMOR_PIERCING')))
        session.state('DEVICES', ('ammoBay', 'critical', 'critical'))
        cls.ammo_rack_damage_log = game.hud_text('damage_log')
        game.events.onAvatarBecomeNonPlayer()
        cls.panels_after_battle = game.hud_components()

    def test_main_gun_is_out_of_reach_before_any_damage(self):
        self.assertIn(u'Осн. калибр', self.panels['battle_progress']['text'])
        self.assertIn(u'недостижим', self.panels['battle_progress']['text'])

    def test_main_gun_counts_the_own_share_of_the_team_damage(self):
        self.assertIn(u'доля 100% · команда 390', self.main_gun)

    def test_damage_log_names_the_rammer_and_its_class(self):
        self.assertIn(u'−140', self.rammed)
        self.assertIn(u'KV-1 таран', self.rammed)
        self.assertIn('class_heavy_32.png', self.rammed)

    def test_an_ammo_rack_hit_shows_in_the_damage_log(self):
        self.assertIn(u'боеукладка', self.ammo_rack_damage_log)

    def test_leaving_the_battle_removes_the_controller_panels(self):
        self.assertEqual(self.panels_after_battle, {})


class LoadoutAndStreamerTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        game.open_hangar()
        session = game.enter_battle(1, tank_id=1)
        cls.loadout = copy.deepcopy(game.hud_components()['battle_loadout'])

        session.own_feedback(
            Feedback(KINDS.RECEIVED_DAMAGE, ENEMY_VEHICLE, Extra(310)),
            Feedback(KINDS.TANKING, ALLY_VEHICLE, Extra(200, SHELL_TYPES.HE_MODERN)),
        )
        cls.received = game.hud_text('damage_log')
        session.arena.onVehicleKilled(OWN_VEHICLE, ENEMY_VEHICLE, 0, 0)

        game.press(STREAMER_KEY)
        cls.panels_hidden = game.hud_components()
        session.own_feedback(Feedback(KINDS.TANKING, ALLY_VEHICLE, Extra(100)))
        cls.panels_hidden_after_feedback = game.hud_components()
        game.press(STREAMER_KEY)
        cls.panels_shown_again = copy.deepcopy(game.hud_components())
        cls.play_modifiers(game)
        game.events.onAvatarBecomeNonPlayer()
        cls.panels_after_battle = game.hud_components()

    @classmethod
    def play_modifiers(cls, game):
        # RU 1.45 client checks read Ctrl and Shift on either side (KEY_LCONTROL or KEY_RCONTROL).
        big_world = sys.modules['BigWorld']
        big_world.isKeyDown = lambda key: key == RIGHT_CONTROL
        game.press(STREAMER_KEY)
        cls.panels_with_control_only = sorted(game.hud_components())
        big_world.isKeyDown = lambda key: key in (RIGHT_CONTROL, RIGHT_SHIFT)
        game.press(STREAMER_KEY)
        cls.panels_with_right_keys = game.hud_components()
        big_world.isKeyDown = lambda key: True
        game.press(STREAMER_KEY)
        cls.panels_with_every_key = sorted(game.hud_components())

    def test_battle_loadout_shows_the_devices_and_the_deluxe_star(self):
        self.assertIn('img://gui/maps/icons/artefact/rammer.png', self.loadout['text'])
        self.assertEqual(self.loadout['text'].count(u'★'), 1)
        self.assertFalse(self.loadout['drag'])

    def test_damage_log_names_the_shooter_and_the_blocked_damage(self):
        self.assertIn(u'Pz. IV', self.received)
        self.assertIn(u'−310', self.received)
        self.assertIn(u'200 ОФ', self.received)

    def test_the_streamer_hotkey_hides_every_panel_and_what_comes_while_hidden(self):
        self.assertEqual(self.panels_hidden, {})
        self.assertEqual(self.panels_hidden_after_feedback, {})

    def test_the_streamer_hotkey_again_shows_the_panels_with_what_came_meanwhile(self):
        self.assertIn(u'Блок 300', self.panels_shown_again['damage_log']['text'])

    def test_the_streamer_hotkey_needs_control_and_shift_on_either_side(self):
        self.assertIn('damage_log', self.panels_with_control_only)
        self.assertEqual(self.panels_with_right_keys, {})
        self.assertIn('damage_log', self.panels_with_every_key)

    def test_leaving_the_battle_clears_the_loadout_panels(self):
        self.assertEqual(self.panels_after_battle, {})


class LoadoutWithoutGuiVehicleTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        cls.builder_calls = game.install_failing_vehicle_builder()
        game.open_hangar()
        game.enter_battle(1, tank_id=1)
        cls.loadout = copy.deepcopy(game.hud_components().get('battle_loadout'))

    def test_the_builder_gets_the_role_slot_and_the_arena_modifiers_like_the_client(self):
        self.assertIn(('setRoleSlot', ROLE_SLOT), self.builder_calls)
        self.assertIn(('setModifiers', ARENA_MODIFIERS), self.builder_calls)

    def test_the_builder_gets_the_full_descriptor_of_the_arena_list_not_the_public_one(self):
        self.assertIn(('setStrCD', 'own-compact-descr'), self.builder_calls)

    def test_the_devices_still_show_when_the_gui_vehicle_cannot_be_built(self):
        self.assertIn('img://gui/maps/icons/artefact/rammer.png', self.loadout['text'])
        self.assertIn('img://gui/maps/icons/artefact/vents.png', self.loadout['text'])


class LoadoutFromTheSetupsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        turbocharger = (Device('turbocharger', ['mobility']), device_slot('mobility'))
        setup = list(game.own_devices[:2]) + [turbocharger]
        game.install_setup_vehicle_builder(setup)
        game.open_hangar()
        game.enter_battle(1, tank_id=1)
        cls.loadout = copy.deepcopy(game.hud_components().get('battle_loadout'))
        cls.log = session_log()

    def test_the_third_device_of_the_setup_shows_when_the_arena_descriptor_lacks_it(self):
        self.assertIn('img://gui/maps/icons/artefact/turbocharger.png', self.loadout['text'])

    def test_every_slot_read_is_logged_once(self):
        self.assertIn('slots from setups: 1 rammer, 2 vents, 3 turbocharger', self.log)

    def test_the_read_counts_the_three_devices(self):
        self.assertIn('battle_loadout: 3 devices, 0 directives', self.log)


def session_log():
    log_module = sys.modules.get('gui.mods.otmetki.core.log')
    if log_module is not None:
        log_module.flush_file()
    with open(os.path.join('mods', 'configs', 'otmetki', 'otmetki.log'), 'rb') as handle:
        return handle.read().decode('utf-8')


class LoadoutFromTheArenaListTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        game.open_hangar()
        game.enter_battle(1, tank_id=1)
        cls.loadout = copy.deepcopy(game.hud_components().get('battle_loadout'))
        cls.log = session_log()

    def test_the_row_shows_the_equipment_the_public_descriptor_lacks(self):
        self.assertIn('img://gui/maps/icons/artefact/rammer.png', self.loadout['text'])

    def test_the_read_is_logged_with_its_counts(self):
        self.assertIn('battle_loadout: 2 devices, 0 directives, icons found 2', self.log)


class LoadoutListedLateTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        game.own_vehicle_listed_late = True
        game.open_hangar()
        session = game.enter_battle(1, tank_id=1)
        cls.before = game.hud_components().get('battle_loadout')
        cls.log_before = session_log()

        game.list_own_vehicle(session, 1)
        session.arena.onVehicleUpdated(ENEMY_VEHICLE)
        cls.after_other_vehicle = game.hud_components().get('battle_loadout')
        session.arena.onVehicleUpdated(OWN_VEHICLE)
        cls.after = copy.deepcopy(game.hud_components().get('battle_loadout'))

        game.run_callbacks()
        cls.log = session_log()

    def test_nothing_shows_before_the_own_vehicle_is_listed(self):
        self.assertIsNone(self.before)

    def test_the_empty_read_logs_its_reason(self):
        self.assertIn('battle_loadout: nothing to show, the own vehicle is not in the arena list yet', self.log_before)

    def test_another_vehicle_update_does_not_read_again(self):
        self.assertIsNone(self.after_other_vehicle)

    def test_the_own_vehicle_update_brings_the_row(self):
        self.assertIn('img://gui/maps/icons/artefact/vents.png', self.after['text'])

    def test_the_battle_report_names_the_shown_row(self):
        self.assertIn('battle_loadout shown', self.log)

    def test_the_damage_log_is_on_screen_before_any_damage(self):
        self.assertIn('damage_log shown', self.log)

    def test_the_dark_lamp_says_why_in_the_report(self):
        self.assertIn('sixth_sense waiting: the own vehicle has not been spotted yet', self.log)

    def test_the_gun_arc_of_a_full_turret_says_why_in_the_report(self):
        self.assertIn('gun_arc waiting: the gun has no traverse limits', self.log)

    def test_the_hidden_platoon_panel_says_why_in_the_report(self):
        self.assertIn('platoon_points waiting: not in a platoon', self.log)


class HangarHelpersTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_avatar_and_device_stubs()
        app = game.open_hangar()
        cls.missions_rows = game.instances()['personal_missions'].ui_page()['rows']
        cls.components_at_start = sorted(game.components)
        app.ui.show('otmetki.session', 'mine', SESSION_LABEL_PLACE)
        cls.set_private_mode(game, app, True)
        cls.components_private = sorted(game.components)
        cls.set_private_mode(game, app, False)
        cls.session_label = game.components['otmetki.session']['text']

    @staticmethod
    def set_private_mode(game, app, is_private):
        game.hud_module().component_config(app).get('streamer_mode').update({'private': is_private})
        app.bus.emit('component_settings', 'streamer_mode', ['private'])

    def test_personal_missions_start_with_an_empty_page_and_no_label(self):
        self.assertEqual(self.missions_rows, [])
        self.assertNotIn('otmetki.personal_missions', self.components_at_start)

    def test_private_mode_hides_the_session_label(self):
        self.assertNotIn('otmetki.session', self.components_private)

    def test_leaving_private_mode_brings_the_session_label_back(self):
        self.assertEqual(self.session_label, 'mine')


class GunAndWoundsTest(StoryTest):

    @classmethod
    def play(cls, game):
        app, vehicle_class = open_shots_hangar(game)
        instances = game.instances()
        game.vehicle.item = instance('Vehicle', {'intCD': 1, 'name': 'ussr:R04_T-34'})
        cls.hangar_info_actions = instances['hangar_info'].ui_actions()
        game.vehicle.item = None

        session = game.enter_battle_with_gun((-0.26, 0.26))
        cls.play_gun_arc(game, app, session)
        cls.play_bush_circle(game, session)

        game.own_vehicle.showDamageFromShot(ENEMY_VEHICLE, [FRONT_HULL_PEN], 0, 1.0, False)
        vehicle_class(False).showDamageFromShot(ENEMY_VEHICLE, [FRONT_HULL_PEN], 0, 1.0, False)
        session.own_feedback(Feedback(KINDS.RECEIVED_DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.shots = list(game.shots)
        game.back_to_hangar()
        cls.wounds_rows = copy.deepcopy(instances['battle_results'].ui_page()['rows'])
        cls.is_wounds_file_saved = os.path.isfile(os.path.join(app.config_dir, 'battle_hits_%d.json' % ACCOUNT))
        instances['battle_results'].ui_action('clear')
        cls.wounds_rows_cleared = instances['battle_results'].ui_page()['rows']

    @classmethod
    def play_gun_arc(cls, game, app, session):
        session.shared.crosshair = crosshair_proxy()
        package('AvatarInputHandler')
        module('AvatarInputHandler.cameras', getViewProjectionMatrix=CameraAlongZ)
        sys.modules['Math'].Matrix = HullAtOrigin
        sys.modules['Math'].Vector4 = Vector4
        game.player.getOwnVehicleStabilisedMatrix = lambda: 'own-matrix'
        game.player.gunRotator.markerInfo = (Vector(0.0, 0.0, 300.0), Vector(0.0, 0.0, 1.0), 1.0)
        game.instances()['gun_arc'].render()
        cls.gun_arc = copy.deepcopy(game.hud_module().hud_layer(app).widgets.get('otmetki.hud.gun_arc'))

    @classmethod
    def play_bush_circle(cls, game, session):
        cls.models_before = list(game.player.models)
        game.press(BUSH_CIRCLE_KEY)
        circle = game.player.models[0]
        cls.circle_area = circle.root.items[0].args
        cls.circle_motors = list(circle.motors)
        game.key_down(key_event(BUSH_CIRCLE_KEY, is_repeated=True))
        cls.is_circle_kept_while_held = game.player.models == [circle]
        game.press(BUSH_CIRCLE_KEY)
        cls.models_after_second_press = list(game.player.models)
        game.press(BUSH_CIRCLE_KEY)
        session.arena.onVehicleKilled(OWN_VEHICLE, ENEMY_VEHICLE, 0, 0)
        cls.models_after_death = list(game.player.models)

    def test_hangar_info_links_the_armor_page_of_the_selected_tank(self):
        self.assertEqual(self.hangar_info_actions[0]['link'], '/t/r04-t-34/armor')

    def test_the_gun_arc_marks_both_traverse_limits_beside_the_reticle(self):
        data = self.gun_arc['data']

        self.assertEqual((data['left'], data['right']), ({'x': -255, 'y': 0}, {'x': 255, 'y': 0}))

    def test_the_gun_arc_draws_the_corner_markers_by_default(self):
        self.assertEqual(self.gun_arc['data']['marker'], 'corner')

    def test_the_bush_circle_hotkey_draws_the_circle_on_the_own_tank(self):
        self.assertEqual(self.models_before, [])
        self.assertEqual(self.circle_area, BUSH_CIRCLE_AREA)
        self.assertEqual(self.circle_motors, [('servo', 'own-matrix')])

    def test_a_held_bush_circle_hotkey_keeps_the_circle(self):
        self.assertTrue(self.is_circle_kept_while_held)

    def test_the_bush_circle_hotkey_again_removes_the_circle(self):
        self.assertEqual(self.models_after_second_press, [])

    def test_the_bush_circle_goes_with_the_own_tank(self):
        self.assertEqual(self.models_after_death, [])

    def test_the_hits_on_me_let_the_game_draw_every_shot(self):
        self.assertEqual(self.shots, [ENEMY_VEHICLE, ENEMY_VEHICLE])

    def test_the_battle_results_page_lists_the_battle_with_the_hits_on_me(self):
        row = self.wounds_rows[0]

        self.assertEqual(row['id'], '4242')
        self.assertEqual(row['details'][1]['value'], u'Корпус, лоб · пробитие · −390 · Pz. IV')
        self.assertEqual([mark['tone'] for mark in row['figure']['marks']], ['pen'])
        self.assertTrue(self.is_wounds_file_saved)

    def test_clearing_the_battle_results_empties_the_hits_on_me(self):
        self.assertEqual(self.wounds_rows_cleared, [])


def open_shots_hangar(game):
    game.install_hud_stubs()
    vehicle_class = game.install_shot_and_bush_circle_stubs()
    app = game.open_hangar()
    return app, vehicle_class


class RicochetTest(StoryTest):

    @classmethod
    def play(cls, game):
        app, vehicle_class = open_shots_hangar(game)
        session = game.enter_battle_with_gun(None)
        vehicle_class(False).showDamageFromShot(ALLY_VEHICLE, [RICOCHET_POINT], 0, 0.0, False)
        game.own_vehicle.showDamageFromShot(ENEMY_VEHICLE, [RICOCHET_POINT], 0, 0.0, False)
        session.own_feedback(
            Feedback(KINDS.TANKING, ENEMY_VEHICLE, Extra(240)),
            Feedback(KINDS.TANKING, ALLY_VEHICLE, Extra(100)),
        )
        cls.hits = game.hud_text('damage_log')

    def test_damage_log_tells_a_ricochet_from_the_shot_drawn_on_the_own_tank(self):
        self.assertIn(u'Pz. IV рикошет', self.hits)
        self.assertIn(u'KV-1 не пробил', self.hits)


class BushCircleAfterBattleTest(StoryTest):

    @classmethod
    def play(cls, game):
        open_shots_hangar(game)
        game.enter_battle_with_gun(None)
        avatar = game.player
        game.press(BUSH_CIRCLE_KEY)
        game.player = Player(ACCOUNT)
        game.events.onAvatarBecomeNonPlayer()
        cls.battle_avatar_models = list(avatar.models)
        game.press(BUSH_CIRCLE_KEY)
        cls.hangar_models = list(game.player.models)

    def test_the_bush_circle_leaves_with_the_battle_it_was_drawn_in(self):
        self.assertEqual(self.battle_avatar_models, [])

    def test_the_bush_circle_hotkey_draws_nothing_in_the_hangar(self):
        self.assertEqual(self.hangar_models, [])


class SiteRecordsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_site_vehicle()
        app = game.open_hangar(is_bound=True)

        def failing_listener(tank_id):
            raise RuntimeError('listener')

        sys.modules['gui.mods.otmetki.core.client.me'].tank_ratings(app).listeners.callbacks.insert(0, failing_listener)
        goals = contract_example('goals.example.json')
        game.answer('tanks', contract_example('ratings-tanks.example.json'))
        game.answer('goals', goals)
        cls.goals_label = game.components['otmetki.session']['text']
        cls.hangar_sounds = list(game.sounds)
        cls.play_battle(game)
        cls.play_results(game, app, goals)

    @classmethod
    def play_battle(cls, game):
        session = game.enter_battle(1, tank_id=1)
        session.own_feedback(
            Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(1500)),
            Feedback(KINDS.SPOTTED, ENEMY_VEHICLE, None),
            Feedback(KINDS.KILL, ENEMY_VEHICLE, None),
        )
        cls.battle_panels = copy.deepcopy(game.hud_components())
        cls.components_in_battle = sorted(game.components)
        game.events.onAvatarBecomeNonPlayer()
        session = game.enter_battle(1, tank_id=1, gui_type=TRAINING_GUI_TYPE)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(1500)))
        cls.training_progress = game.hud_text('battle_progress')
        game.events.onAvatarBecomeNonPlayer()

    @classmethod
    def play_results(cls, game, app, goals):
        game.player = Player(ACCOUNT)
        game.events.onAccountShowGUI()
        results = _support.battle_results()
        game.events.onBattleResultsReceived(True, results)
        for step in range(1, 30):
            app.bus.emit('tick', time.time() + step * 5)
        achieved = dict(goals['goals'][0], current=3050.0, status='achieved')
        game.answer('goals', dict(goals, goals=[achieved]))
        cls.goal_messages = game.messages_with(u'цель выполнена')
        cls.sounds_after_goal = list(game.sounds)
        cls.messages = list(game.messages)

    def test_site_goals_show_in_the_hangar_without_a_sound(self):
        self.assertIn(u'Ср. урон 3 000', self.goals_label)
        self.assertEqual(self.hangar_sounds, [])

    def test_battle_progress_shows_the_main_gun_and_the_battle_wn8(self):
        text = self.battle_panels['battle_progress']['text']

        self.assertIn(u'Осн. калибр', text)
        self.assertIn(u'WN8 боя', text)
        self.assertNotIn('otmetki.session', self.components_in_battle)

    def test_the_main_gun_shows_the_damage_past_the_threshold_not_the_damage_dealt(self):
        text = self.battle_panels['battle_progress']['text']

        self.assertIn(u'+500', text)
        self.assertNotIn(u'1 500', text)

    def test_the_main_gun_stays_out_of_a_training_room(self):
        self.assertIn(u'WN8 боя', self.training_progress)
        self.assertNotIn(u'Осн. калибр', self.training_progress)

    def test_an_achieved_goal_is_announced(self):
        self.assertTrue(self.goal_messages, self.messages)

    def test_an_achieved_goal_plays_no_sound(self):
        self.assertEqual(self.sounds_after_goal, [])


class PlatoonTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        sys.modules['gui.battle_control.battle_constants'].VEHICLE_VIEW_STATE.STUN = VIEW_STATE['STUN']
        ArenaDP.isSquadMan = lambda provider, vehicle_id: vehicle_id == ALLY_VEHICLE
        try:
            cls.play_platoon(game)
        finally:
            del ArenaDP.isSquadMan

    @classmethod
    def play_platoon(cls, game):
        game.open_hangar()
        session = game.enter_battle(1)
        platoon = game.instances()['platoon_points'].platoon
        for stun in (stun_info(130.0, 12.0), stun_info(130.0, 11.0), stun_info(0.0, 0.0), stun_info(160.0, 10.0)):
            session.state('STUN', stun)
        session.state('HEALTH', 640)
        session.feedback.onPlayerSummaryFeedbackReceived(summary_with_stun(5000))
        session.control(ALLY_VEHICLE)
        session.state('STUN', stun_info(190.0, 10.0))
        session.state('HEALTH', 700)
        cls.own_hp = platoon.members[OWN_VEHICLE]['hp']
        cls.ally_hp = platoon.members[ALLY_VEHICLE]['hp']
        cls.own_totals = platoon.own_totals()

    def test_platoon_points_keep_each_members_hp(self):
        self.assertEqual(self.own_hp, 640)
        self.assertEqual(self.ally_hp, 700)

    def test_platoon_points_total_the_own_damage_and_assist(self):
        self.assertEqual(self.own_totals, (2150, 5950))


class ReplayAndShareTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        app.bus.emit('replay_uploaded', '777', REPLAY_ID)
        app.bus.emit('tick', time.time() + 120)
        polls = game.fetches_to('/mod/me/replays')
        cls.polls = [json.loads(poll[3]) for poll in polls]
        polls[0][4](response_json(contract_example('replay-analysis.example.json')))
        cls.replay_messages = game.messages_with(u'разбор реплея готов', u'точность 83%')
        cls.play_share(game, app, game.instances()['session_stats'])
        cls.play_unlinked_channel(game, app)
        cls.messages = list(game.messages)

    @classmethod
    def play_share(cls, game, app, stats):
        cls.actions_before = [action['id'] for action in stats.ui_actions()]
        cls.shares_before = game.fetches_to('/mod/me/session-share')
        app.config.update({'share_session_report': True, 'share_session_channel': 'both'})
        app.bus.emit('component_settings', 'session_stats', ['share_session_report'])
        shares = game.fetches_to('/mod/me/session-share')
        cls.share_request = json.loads(shares[0][3])
        shares[0][4](Response(200, b'{}'))
        cls.synced = account_part(app.state_file.read({}), 'session_share_synced')
        cls.refusal = stats.ui_action('share_now')
        game.events.onBattleResultsReceived(True, _support.battle_results())
        cls.share_answer = stats.ui_action('share_now')
        cls.sent = json.loads(game.fetches_to('/mod/me/session-share/send')[0][3])
        cls.shared_session_id = stats.session.session_id
        cls.actions_after = [action['id'] for action in stats.ui_actions()]
        cls.new_session_answer = stats.ui_action('new_session')
        cls.new_session_id = stats.session.session_id
        cls.new_session_battles = stats.session.summary(time.time())['battles']

    @classmethod
    def play_unlinked_channel(cls, game, app):
        app.config.update({'share_session_channel': 'discord'})
        app.bus.emit('component_settings', 'session_stats', ['share_session_channel'])
        shares = game.fetches_to('/mod/me/session-share')
        shares[-1][4](Response(409, b'{"error":"channel_not_linked"}'))
        cls.unlinked_messages = game.messages_with(u'привяжите выбранный канал')
        app.bus.emit('tick', time.time() + 3600)
        cls.share_count_before_tick = len(shares)
        cls.share_count_after_tick = len(game.fetches_to('/mod/me/session-share'))

    def test_an_uploaded_replay_is_polled_once_with_its_id(self):
        self.assertEqual(len(self.polls), 1)
        self.assertEqual(self.polls[0]['replay_ids'], [REPLAY_ID])

    def test_a_ready_replay_analysis_is_announced(self):
        self.assertTrue(self.replay_messages, self.messages)

    def test_session_stats_offer_no_share_while_sharing_is_off(self):
        self.assertEqual(self.actions_before, ['new_session', 'refresh', 'site'])
        self.assertEqual(self.shares_before, [])

    def test_turning_the_session_share_on_sends_both_channels(self):
        self.assertEqual(self.share_request['channels'], ['telegram', 'discord'])

    def test_an_accepted_session_share_is_remembered_as_synced(self):
        self.assertEqual(self.synced, [True, 'both'])

    def test_share_now_is_refused_before_a_battle(self):
        self.assertEqual(self.refusal['kind'], 'error')

    def test_share_now_sends_the_current_session_after_a_battle(self):
        self.assertEqual(self.share_answer['kind'], 'info')
        self.assertEqual(self.sent['session_id'], self.shared_session_id)
        self.assertEqual(self.actions_after, ['new_session', 'share_now', 'refresh', 'site'])

    def test_a_new_session_starts_empty(self):
        self.assertEqual(self.new_session_answer['kind'], 'info')
        self.assertNotEqual(self.new_session_id, self.shared_session_id)
        self.assertEqual(self.new_session_battles, 0)

    def test_an_unlinked_share_channel_is_announced_and_not_retried(self):
        self.assertTrue(self.unlinked_messages, self.messages)
        self.assertEqual(self.share_count_after_tick, self.share_count_before_tick)


class HangarSmallWinsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_garage_stubs()
        game.install_customization_stubs()
        game.open_hangar()
        vehicle = game.vehicle.item
        vehicle.descriptor.makeCompactDescr = lambda: 'cd-1'
        tweaks = game.instances()['hangar_tweaks']
        cls.nothing_refusal = tweaks.ui_action('remove_style')['text']
        cls.nothing_text = tweaks.app.translate('hangar_tweaks_refused_nothing')
        vehicle.isStyleInstalled = True
        cls.remove_answer = tweaks.ui_action('remove_style')
        cls.outfits = list(game.outfits)
        cls.result_messages = list(game.result_messages)

    def test_removing_a_style_is_refused_when_none_is_installed(self):
        self.assertEqual(self.nothing_refusal, self.nothing_text)

    def test_removing_an_installed_style_applies_an_empty_outfit(self):
        self.assertEqual(self.remove_answer['kind'], 'info')
        self.assertEqual(self.outfits, [((('outfit', 'empty-component', 'cd-1'), 7),)])
        self.assertEqual(self.result_messages, ['style removed'])


class OnslaughtAndEventCardsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.open_hangar()
        instances = game.instances()
        instances['event_trackers'].app.config.update({'hangar_event_trackers': True})
        comp7 = game.install_onslaught_services()
        shop = game.install_event_services()
        module('skeletons.gui.game_control', IComp7Controller=comp7, IShopSalesEventController=shop)
        game.vehicle.item = instance('Vehicle', {'intCD': 1})
        instances['comp7_helper'].refresh()
        instances['event_trackers'].refresh()
        cls.comp7_text = game.components['otmetki.comp7_helper']['text']
        cls.caravan_text = game.components['otmetki.event_trackers.caravan']['text']
        cls.triathlon_text = game.components['otmetki.event_trackers.triathlon']['text']
        game.services[comp7].isComp7PrbActive = lambda: False
        instances['comp7_helper'].refresh()
        cls.components_outside_queue = sorted(game.components)

    def test_the_onslaught_card_shows_the_thresholds_and_the_skill_but_not_the_stock_header_rating(self):
        self.assertIn(u'Чемпион B', self.comp7_text)
        self.assertIn(u'Точка сбора', self.comp7_text)
        self.assertNotIn(u'До «Чемпион A»', self.comp7_text)

    def test_event_cards_show_the_caravan_tokens_and_the_triathlon(self):
        self.assertIn(u'12 жетонов', self.caravan_text)
        self.assertIn(u'Триатлон', self.triathlon_text)

    def test_the_onslaught_card_leaves_outside_the_onslaught_queue(self):
        self.assertNotIn('otmetki.comp7_helper', self.components_outside_queue)


class EarlyExitServerRequestTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.load(['mod_otmetki'])
        results = game.leave_battle_early(app)
        cls.arena_id = results['arenaUniqueID']
        for step in range(EARLY_EXIT_POLLS):
            app.battles.poll_pending_results(SERVER_TIME + 100 * step)
        cls.requests_while_polling = list(game.results_cache.server_requests)
        cls.pending = (app.battles.pending_arenas, app.battles.shots_by_arena, app.battles.queue_wait_by_arena)
        cls.battles_while_polling = len(game.battle_events(app))
        game.results_cache.get(cls.arena_id, lambda code, data: None)
        game.results_cache.saved[(game.player.name, cls.arena_id)] = results
        game.results_service.onResultPosted(instance('ReusableInfo', {'arenaUniqueID': cls.arena_id}), None, None)
        cls.battles_after_post = len(game.battle_events(app))
        cls.requests_after_post = list(game.results_cache.server_requests)

    def test_polling_after_an_early_exit_never_asks_the_server_itself(self):
        pending_arenas, shots, queue_waits = self.pending

        self.assertEqual(self.requests_while_polling, [])
        self.assertEqual(pending_arenas, [])
        self.assertEqual(shots, {})
        self.assertEqual(queue_waits, {})
        self.assertEqual(self.battles_while_polling, 0)

    def test_early_exit_results_come_from_the_game_own_request(self):
        self.assertEqual(self.battles_after_post, 1)
        self.assertEqual(self.requests_after_post, [self.arena_id])


class EarlyExitDiskCacheTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.load(['mod_otmetki'])
        results = game.leave_battle_early(app)
        game.results_cache.saved[(game.player.name, results['arenaUniqueID'])] = results
        app.battles.poll_pending_results(SERVER_TIME)
        cls.battles = len(game.battle_events(app))
        cls.server_requests = list(game.results_cache.server_requests)
        cls.pending_arenas = list(app.battles.pending_arenas)

    def test_early_exit_results_are_read_from_the_disk_cache(self):
        self.assertEqual(self.battles, 1)
        self.assertEqual(self.server_requests, [])
        self.assertEqual(self.pending_arenas, [])


class HangarTweaksTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        game.install_garage_stubs()
        game.open_hangar()
        tweaks = game.instances()['hangar_tweaks']
        cls.demount_answer = tweaks.ui_action('demount_removable')
        cls.processors_at_start = len(game.processors)
        first, reply = game.processors[0]
        cls.first = (first.slot, first.item.name, first.install)
        game.items.vehicle = GarageVehicle([None, GarageDevice('vents'), None])
        reply(result(True, 'rammer demounted'))
        cls.processors_after_success = len(game.processors)
        second, reply = game.processors[1]
        cls.is_second_on_fresh_vehicle = second.vehicle is game.items.vehicle
        cls.second = (second.slot, second.item.name)
        reply(result(False, 'server busy'))
        cls.result_messages = list(game.result_messages)
        cls.processors_after_failure = len(game.processors)
        cls.messages = list(game.messages)
        game.vehicle.item.crew = [(0, object())]
        cls.barracks_answer = tweaks.ui_action('crew_to_barracks')
        cls.berths_text = tweaks.app.translate('hangar_tweaks_refused_berths')

    def test_demounting_starts_with_the_first_removable_slot(self):
        slot, name, is_install = self.first

        self.assertEqual(self.demount_answer['kind'], 'info')
        self.assertEqual(self.processors_at_start, 1)
        self.assertEqual(slot, 0)
        self.assertEqual(name, 'rammer')
        self.assertFalse(is_install)

    def test_after_a_success_the_next_slot_comes_from_the_fresh_vehicle(self):
        self.assertEqual(self.processors_after_success, 2)
        self.assertTrue(self.is_second_on_fresh_vehicle)
        self.assertEqual(self.second, (1, 'vents'))

    def test_a_failed_demount_stops_the_chain_and_every_answer_is_shown(self):
        self.assertEqual(self.result_messages, ['rammer demounted', 'server busy'])
        self.assertEqual(self.processors_after_failure, 2)
        self.assertTrue(self.messages)

    def test_crew_to_barracks_is_refused_without_free_berths(self):
        self.assertEqual(self.barracks_answer, {'kind': 'error', 'text': self.berths_text})


class FieldModificationsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_garage_stubs()
        game.load(['mod_otmetki'])
        _, cls.loadout = sys.modules['gui.mods.otmetki.companion.loadout.client'].read_current_loadout()

    def test_loadout_reads_the_installed_field_modifications(self):
        self.assertEqual(self.loadout['field_modifications'], ['mod_a', 'mod_b'])


class HangarCleanerVerifiedTest(StoryTest):

    @classmethod
    def play(cls, game):
        hangar_class, banner_class = game.install_hangar_view_stubs()
        game.load(list(ENTRY_MODULES))
        hangar = hangar_class()
        hangar._Hangar__onTeaserReceived('teaser', None, None)
        hangar._Hangar__updateCarouselEventEntryState()
        banner_class.tryLoad(5, None)
        cls.teasers = list(game.teasers)
        cls.entries = list(game.entries)
        cls.banner_loads = list(game.banner_loads)

    def test_hangar_cleaner_overrides_private_methods_on_a_verified_client(self):
        self.assertEqual(self.teasers, [])
        self.assertEqual(self.entries, [True])
        self.assertEqual(self.banner_loads, [])


class HangarCleanerUnverifiedTest(StoryTest):
    client_version = '1.46.0.0'

    @classmethod
    def play(cls, game):
        hangar_class, banner_class = game.install_hangar_view_stubs()
        game.load(list(ENTRY_MODULES))
        hangar_class()._Hangar__onTeaserReceived('teaser', None, None)
        banner_class.tryLoad(5, None)
        cls.teasers = list(game.teasers)
        cls.banner_loads = list(game.banner_loads)

    def test_hangar_cleaner_leaves_private_methods_alone_on_an_unverified_client(self):
        self.assertEqual(self.teasers, ['teaser'])
        self.assertEqual(self.banner_loads, [])


class SignedRequestsTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.load(['mod_otmetki'])
        game.play_battle(app)
        cls.is_sent = app.sender.tick(SERVER_TIME)
        signing = sys.modules['gui.mods.otmetki.core.net.signing']
        cls.server_now = int(time.time()) + 600
        headers = {'X-Otmetki-Server-Time': str(cls.server_now)}
        game.ingest_fetches()[-1][4](Response(428, b'{"error":"stale_request"}', headers))
        retried = game.ingest_fetches()
        cls.retries = len(retried)
        cls.stamp = int(retried[-1][2][signing.TIMESTAMP_HEADER])
        retried[-1][4](Response(429, b'', {'Retry-After': '900'}))
        cls.in_flight = app.sender.in_flight
        cls.retry_at = app.outbox.retry_at
        cls.queued = len(app.outbox.events)

    def test_a_played_battle_is_sent_on_the_next_tick(self):
        self.assertTrue(self.is_sent)

    def test_a_stale_request_is_signed_again_with_the_server_time(self):
        self.assertEqual(self.retries, 2)
        self.assertTrue(abs(self.stamp - self.server_now) <= 5, (self.stamp, self.server_now))

    def test_a_rate_limited_request_waits_for_retry_after(self):
        self.assertIsNone(self.in_flight)
        self.assertGreaterEqual(self.retry_at, SERVER_TIME + 900)
        self.assertEqual(self.queued, 1)


class MarksTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        reads = game.moe_curve_reads(app)
        cls.curve_reads = len(reads)
        reads[0](response_json(MOE_CURVE))
        cls.hangar_marks = copy.deepcopy(game.hud_components()['hangar_marks'])
        game.hud_module().component_config(app).get('marks_panel').update({'style': 'extended'})
        session = game.enter_battle(1, tank_id=1)
        cls.battle_panels = copy.deepcopy(game.hud_components())
        session.own_feedback(
            Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)),
            Feedback(KINDS.DAMAGE, ALLY_VEHICLE, Extra(50)),
        )
        cls.after_damage = game.hud_text('marks_panel')
        session.control(ALLY_VEHICLE)
        session.own_feedback(Feedback(KINDS.RADIO_ASSIST, ENEMY_VEHICLE, Extra(640)))
        cls.after_assist = game.hud_text('marks_panel')
        session.feedback.onPlayerSummaryFeedbackReceived(Summary())
        cls.after_summary = game.hud_text('marks_panel')
        game.events.onAvatarBecomeNonPlayer()
        cls.panels_after_battle = sorted(game.hud_components())
        cls.state_parts = [key for key, _ in app.state_parts]

    def test_the_hangar_asks_the_site_once_for_the_moe_curve(self):
        self.assertEqual(self.curve_reads, 1)

    def test_hangar_marks_show_the_moe_and_the_next_threshold(self):
        self.assertEqual(self.hangar_marks['space'], 'lobby')
        self.assertIn('81.50%', self.hangar_marks['text'])
        self.assertIn('2 600', self.hangar_marks['text'])

    def test_the_marks_panel_takes_the_place_of_the_hangar_marks_in_battle(self):
        panel = self.battle_panels['marks_panel']

        self.assertNotIn('hangar_marks', self.battle_panels)
        self.assertEqual(panel['space'], 'battle')
        self.assertTrue(panel['drag'])

    def test_the_marks_panel_counts_only_the_own_damage(self):
        self.assertIn('390', self.after_damage)

    def test_the_marks_panel_adds_the_assist_after_death(self):
        self.assertIn('1 030', self.after_assist)

    def test_the_marks_panel_takes_the_totals_of_the_battle_summary(self):
        self.assertIn('2 790', self.after_summary)

    def test_leaving_the_battle_removes_the_marks_panel_and_keeps_the_pace(self):
        self.assertNotIn('marks_panel', self.panels_after_battle)
        self.assertIn('moe_pace', self.state_parts)


class MarksPartsTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        game.moe_curve_reads(app)[0](response_json(MOE_CURVE))
        app.config.update({'battle_moe_panel': False})
        app.bus.emit('component_settings', 'marks_panel', ['battle_moe_panel'])
        cls.card_without_the_battle_panel = 'hangar_marks' in game.hud_components()
        game.enter_battle(1, tank_id=1)
        cls.battle_panels = sorted(game.hud_components())
        game.events.onAvatarBecomeNonPlayer()
        app.config.update({'battle_moe_panel': True, 'hangar_tank_card': False})
        app.bus.emit('component_settings', 'hangar_marks', ['hangar_tank_card'])
        cls.card_switched_off = 'hangar_marks' in game.hud_components()
        game.enter_battle(2, tank_id=1)
        cls.battle_panels_without_the_card = sorted(game.hud_components())

    def test_the_card_stays_while_the_battle_panel_is_off(self):
        self.assertTrue(self.card_without_the_battle_panel)

    def test_the_battle_panel_switched_off_stays_out_of_the_battle(self):
        self.assertNotIn('marks_panel', self.battle_panels)

    def test_the_card_follows_its_own_switch(self):
        self.assertFalse(self.card_switched_off)

    def test_the_battle_panel_runs_without_the_card(self):
        self.assertIn('marks_panel', self.battle_panels_without_the_card)


class GamefaceBackendTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby()
        view = game.load_hangar()
        layer = game.hud_module().hud_layer(app)
        cls.backend_name = layer.backend.name
        app.bus.emit('hud_edit', True)
        cls.windows_in_edit = len(game.windows)
        cls.page = game.hud_page()
        cls.play_page_messages(game, app, view)
        app.bus.emit('hud_edit', False)
        cls.page_after_edit = game.hud_page_ids()
        game.res_id = -1
        layer.backend.layout = None
        app.bus.emit('hud_edit', True)
        cls.labels_without_resource = sorted(game.hud_components())
        cls.has_panels_without_resource = layer.has_panels

    @classmethod
    def play_page_messages(cls, game, app, view):
        moved = {
            'type': 'moved',
            'id': 'otmetki.hud.damage_log',
            'x': 40,
            'y': 50,
            'align_x': 'center',
            'align_y': 'top',
        }
        game.send_from_page(view, INJECT_ALIAS, **moved)
        cls.saved = game.saved_components(app)['damage_log']
        game.scaleform.page(view, INJECT_ALIAS).getViewModel().send({'message': 'not json'})

    def test_gameface_is_the_backend(self):
        self.assertEqual(self.backend_name, 'gameface')

    def test_hud_edit_opens_no_window(self):
        self.assertEqual(self.windows_in_edit, 0)

    def test_the_hud_page_shows_the_previews_with_the_cursor(self):
        panels = {panel['id']: panel for panel in self.page['panels']}

        self.assertTrue(self.page['cursor'])
        self.assertIn('390', panels['otmetki.hud.damage_log']['text'])

    def test_a_panel_moved_on_the_page_saves_its_place(self):
        self.assertEqual(self.saved['x'], 40)
        self.assertEqual(self.saved['y'], 50)
        self.assertEqual(self.saved['align_x'], 'center')
        self.assertEqual(self.saved['align_y'], 'top')

    def test_leaving_hud_edit_takes_the_previews_off_the_page(self):
        previews = [panel_id for panel_id in self.page_after_edit if panel_id.startswith('otmetki.hud.')]

        self.assertEqual(previews, [])

    def test_without_the_gameface_resource_the_panels_stay_hidden(self):
        self.assertFalse(self.has_panels_without_resource)
        self.assertEqual(self.labels_without_resource, [])


class InjectHangarTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby()
        cls.moves = []
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE, on_moved=cls.moves.append)
        cls.play_hangar(game, game.load_hangar())
        cls.play_reload(game)

    @classmethod
    def play_hangar(cls, game, view):
        component = game.scaleform.lobby.factory.made[-1]
        cls.placed_in_the_hangar = component in view.flashObject.children
        cls.page = game.injected_page(view)
        cls.mouse_outside_edit = component.mouseChildren
        game.set_edit_modifier(True)
        cls.edit_page = game.injected_page(view)
        cls.mouse_in_edit = component.mouseChildren
        game.send_from_page(view, INJECT_ALIAS, type='moved', id=INJECT_LABEL, x=40, y=50)
        game.set_edit_modifier(False)
        cls.mouse_after_edit = component.mouseChildren
        game.scaleform.destroy_view(game.scaleform.lobby, view)
        cls.page_after_leaving = game.scaleform.page(view, INJECT_ALIAS)

    @classmethod
    def play_reload(cls, game):
        first = game.load_hangar()
        second = game.load_hangar()
        cls.first_after_a_reload = game.scaleform.page(first, INJECT_ALIAS)
        cls.page_after_a_reload = game.injected_page(second)
        game.run_callbacks()
        cls.page_after_the_load_check = game.scaleform.page(second, INJECT_ALIAS)
        cls.windows = len(game.windows)

    def test_the_page_is_placed_in_the_hangar_view(self):
        self.assertTrue(self.placed_in_the_hangar)

    def test_the_hangar_page_gets_the_lobby_labels(self):
        self.assertIn(INJECT_LABEL, [panel['id'] for panel in self.page['panels']])

    def test_the_hangar_page_shows_the_cursor_outside_edit_mode(self):
        self.assertTrue(self.page['cursor'])
        self.assertFalse(self.page['edit'])

    def test_the_hangar_takes_every_click_outside_edit_mode(self):
        self.assertFalse(self.mouse_outside_edit)

    def test_the_edit_modifier_puts_the_page_in_edit_mode(self):
        self.assertTrue(self.edit_page['edit'])

    def test_the_edit_modifier_gives_the_page_the_mouse(self):
        self.assertTrue(self.mouse_in_edit)

    def test_releasing_the_edit_modifier_takes_the_mouse_back(self):
        self.assertFalse(self.mouse_after_edit)

    def test_a_label_dragged_on_the_hangar_page_reaches_its_owner(self):
        self.assertEqual(self.moves, [{'x': 40, 'y': 50}])

    def test_the_page_leaves_with_the_hangar_view(self):
        self.assertIsNone(self.page_after_leaving)

    def test_a_hangar_view_reloaded_before_the_old_one_went_gets_the_one_page(self):
        self.assertIsNone(self.first_after_a_reload)
        self.assertIn(INJECT_LABEL, [panel['id'] for panel in self.page_after_a_reload['panels']])

    def test_a_loaded_page_passes_the_load_check(self):
        self.assertIsNotNone(self.page_after_the_load_check)

    def test_no_window_is_ever_opened(self):
        self.assertEqual(self.windows, 0)


class BattleWindowTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby()
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE)
        hangar = game.load_hangar()
        session = game.enter_window_battle()
        game.scaleform.destroy_view(game.scaleform.lobby, hangar)
        page = game.load_battle_page()
        cls.battle_components_made = len(game.scaleform.battle.factory.made)
        cls.injected_in_battle = INJECT_ALIAS in page.components
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.windows_in_battle = len(game.windows)
        cls.window_layer = game.windows[0].layer
        cls.state = game.hud_page()
        cls.play_stock(game, page)
        cls.play_edit(game, app)
        cls.play_covers(game, page)
        cls.play_leaving(game, page)

    @classmethod
    def play_stock(cls, game, page):
        cls.stock_hidden_before_drawn = set(page.hidden)
        game.send_from_window(type='drawn', ids=['otmetki.hud.damage_log'])
        cls.stock_hidden_once_drawn = set(page.hidden)

    @classmethod
    def play_edit(cls, game, app):
        game.set_battle_cursor(True)
        cls.edit_state = game.hud_page()
        game.send_from_window(type='moved', id='otmetki.hud.damage_log', x=111, y=222, align_x='left',
                              align_y='bottom')
        cls.saved = game.saved_components(app)['damage_log']
        game.set_battle_cursor(False)
        cls.state_after_cursor = game.hud_page()

    @classmethod
    def play_covers(cls, game, page):
        cover = game.hud_module()._state['cover']
        cover._on_gui_visibility(instance('Event', {'ctx': {'visible': False}}))
        cls.visible_under_v = cls.damage_log_visible(game)
        cover._on_gui_visibility(instance('Event', {'ctx': {'visible': True}}))
        cls.visible_after_v = cls.damage_log_visible(game)
        page._setComponentsVisibility(visible={'fullStats'})
        cls.visible_under_tab = cls.damage_log_visible(game)
        cls.stock_hidden_under_tab = 'battleDamageLogPanel' in page.hidden
        page._setComponentsVisibility(hidden={'fullStats'})
        cls.visible_after_tab = cls.damage_log_visible(game)
        cover._on_loading(instance('Event', {'ctx': {'isShown': True}}))
        cls.visible_under_loading = cls.damage_log_visible(game)
        cover._on_loading(instance('Event', {'ctx': {'isShown': False}}))
        cls.visible_after_loading = cls.damage_log_visible(game)

    @staticmethod
    def damage_log_visible(game):
        panels = {panel['id']: panel for panel in game.hud_page()['panels']}
        return panels['otmetki.hud.damage_log']['visible']

    @classmethod
    def play_leaving(cls, game, page):
        game.enter_space('LOBBY')
        game.scaleform.destroy_view(game.scaleform.battle, page)
        cls.windows_after_the_battle = len(game.windows)
        cls.drawn_after_the_battle = game.hud_backend().drawn_aliases()
        game.back_to_hangar()
        cls.hangar_page = [panel['id'] for panel in game.injected_page(game.load_hangar())['panels']]
        cls.windows_back_in_the_hangar = len(game.windows)

    def test_nothing_is_injected_into_the_battle_page(self):
        self.assertEqual(self.battle_components_made, 0)

    def test_the_battle_page_registers_no_page_of_ours(self):
        self.assertFalse(self.injected_in_battle)

    def test_the_battle_draws_in_one_hud_window(self):
        self.assertEqual(self.windows_in_battle, 1)

    def test_the_hud_window_sits_on_the_window_layer(self):
        self.assertEqual(self.window_layer, 7)

    def test_the_hud_window_gets_the_battle_panels(self):
        self.assertIn('otmetki.hud.damage_log', [panel['id'] for panel in self.state['panels']])

    def test_the_hud_window_gets_no_hangar_label(self):
        self.assertNotIn(INJECT_LABEL, [panel['id'] for panel in self.state['panels']])

    def test_the_hud_window_is_not_in_edit_mode_without_the_cursor(self):
        self.assertFalse(self.state['edit'])

    def test_the_stock_damage_log_stays_until_the_window_draws_ours(self):
        self.assertEqual(self.stock_hidden_before_drawn, set())

    def test_the_stock_damage_log_hides_once_the_window_draws_ours(self):
        self.assertIn('battleDamageLogPanel', self.stock_hidden_once_drawn)

    def test_the_battle_cursor_is_the_edit_mode(self):
        self.assertTrue(self.edit_state['edit'])

    def test_a_panel_dragged_in_battle_saves_its_place(self):
        self.assertEqual((self.saved['x'], self.saved['y']), (111, 222))

    def test_hiding_the_cursor_ends_the_edit_mode(self):
        self.assertFalse(self.state_after_cursor['edit'])

    def test_v_hides_the_panels(self):
        self.assertFalse(self.visible_under_v)

    def test_the_panels_come_back_after_v(self):
        self.assertTrue(self.visible_after_v)

    def test_tab_hides_the_panels(self):
        self.assertFalse(self.visible_under_tab)

    def test_the_panels_come_back_after_tab(self):
        self.assertTrue(self.visible_after_tab)

    def test_tab_keeps_the_stock_damage_log_hidden(self):
        self.assertTrue(self.stock_hidden_under_tab)

    def test_the_loading_screen_hides_the_panels(self):
        self.assertFalse(self.visible_under_loading)

    def test_the_panels_come_back_after_the_loading_screen(self):
        self.assertTrue(self.visible_after_loading)

    def test_leaving_the_battle_closes_the_hud_window(self):
        self.assertEqual(self.windows_after_the_battle, 0)

    def test_nothing_is_confirmed_drawn_after_the_battle(self):
        self.assertIsNone(self.drawn_after_the_battle)

    def test_the_hangar_page_comes_back_with_the_hangar_labels(self):
        self.assertIn(INJECT_LABEL, self.hangar_page)

    def test_the_hangar_opens_no_window(self):
        self.assertEqual(self.windows_back_in_the_hangar, 0)


class GamefaceWindowFrameTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby()
        game.enter_space('LOBBY')
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE)
        game.load_hangar()
        game.run_callbacks()
        cls.windows_in_the_lobby = len(game.windows)
        game.enter_space('BATTLE')
        session = game.enter_battle(1)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.windows_in_the_battle_frame = len(game.windows)
        game.run_callbacks()
        cls.windows_next_frame = len(game.windows)
        cls.page = game.hud_page_ids()

    def test_the_lobby_opens_no_window(self):
        self.assertEqual(self.windows_in_the_lobby, 0)

    def test_no_window_opens_in_the_frame_the_battle_is_entered(self):
        self.assertEqual(self.windows_in_the_battle_frame, 0)

    def test_the_window_opens_a_frame_after_the_battle_was_entered(self):
        self.assertEqual(self.windows_next_frame, 1)

    def test_the_window_draws_the_battle_panels(self):
        self.assertIn('otmetki.hud.damage_log', self.page)


class InjectWithoutClassFactoryTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby(has_factory=False)
        capture = Capture()
        sys.stdout = capture
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE)
        game.load_hangar()
        cls.windows_in_the_lobby = len(game.windows)
        cls.labels = sorted(game.components)
        cls.drawn = game.hud_backend().drawn_aliases()
        game.enter_window_battle()
        page = game.load_battle_page()
        sys.stdout = Sink()
        cls.output = ''.join(capture.parts)
        cls.windows_in_battle = len(game.windows)
        cls.stock_hidden = set(page.hidden)

    def test_a_page_that_cannot_be_placed_is_logged(self):
        self.assertIn('the page could not be placed in the hangar view', self.output)

    def test_no_window_takes_over_in_the_lobby(self):
        self.assertEqual(self.windows_in_the_lobby, 0)

    def test_the_labels_wait_for_a_page(self):
        self.assertIn(INJECT_LABEL, self.labels)

    def test_nothing_is_confirmed_drawn(self):
        self.assertIsNone(self.drawn)

    def test_the_battle_still_draws_in_the_hud_window(self):
        self.assertEqual(self.windows_in_battle, 1)

    def test_every_stock_element_stays_until_the_window_draws(self):
        self.assertEqual(self.stock_hidden, set())


class InjectPageNeverLoadsTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_inject_lobby(loads_page=False)
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE)
        view = game.load_hangar()
        cls.component_while_loading = INJECT_ALIAS in view.components
        game.run_callbacks()
        cls.component_after_the_load_check = INJECT_ALIAS in view.components
        cls.windows = len(game.windows)
        second = game.load_hangar()
        cls.placed_again = INJECT_ALIAS in second.components

    def test_the_page_waits_while_it_loads(self):
        self.assertTrue(self.component_while_loading)

    def test_a_page_that_never_loads_is_taken_out_of_the_hangar_view(self):
        self.assertFalse(self.component_after_the_load_check)

    def test_no_window_takes_over(self):
        self.assertEqual(self.windows, 0)

    def test_the_next_hangar_view_gets_a_page_again(self):
        self.assertTrue(self.placed_again)


class HudWithoutInjectTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs(inject=False)
        capture = Capture()
        sys.stdout = capture
        app = game.open_hangar()
        sys.stdout = Sink()
        cls.output = ''.join(capture.parts)
        cls.backend_name = game.hud_module().hud_layer(app).backend.name
        app.ui.show(INJECT_LABEL, 'hangar only', HANGAR_LABEL_PLACE)
        cls.windows_in_the_lobby = len(game.windows)
        session = game.enter_battle(1)
        session.own_feedback(Feedback(KINDS.DAMAGE, ENEMY_VEHICLE, Extra(390)))
        cls.battle_page = game.hud_page_ids()

    def test_a_client_without_the_inject_classes_keeps_the_gameface_backend(self):
        self.assertEqual(self.backend_name, 'gameface')

    def test_the_missing_inject_classes_are_logged(self):
        self.assertIn('no inject adaptor for the hangar page', self.output)

    def test_the_hangar_panels_open_no_window(self):
        self.assertEqual(self.windows_in_the_lobby, 0)

    def test_the_battle_draws_in_the_hud_window(self):
        self.assertIn('otmetki.hud.damage_log', self.battle_page)


class SessionLogTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        sys.modules['openwg_gameface'].manager = instance('ResMapManager', {'isResMapValidated': False})
        with open('res_map_restart', 'w') as handle:
            handle.write('')
        game.load(list(ENTRY_MODULES))
        with open(os.path.join('mods', 'configs', 'otmetki', 'otmetki.log'), 'rb') as handle:
            cls.text = handle.read().decode('utf-8')

    def test_session_log_keeps_the_mod_lines_of_the_last_sessions(self):
        self.assertIn('[OTMETKI] session start', self.text)
        self.assertIn(CLIENT_VERSION, self.text)
        self.assertIn('[OTMETKI] HUD renderer: gameface', self.text)
        self.assertLess(self.text.index('session start'), self.text.index('HUD renderer'))
        self.assertIn('[OTMETKI] started', self.text)
        self.assertIn('OpenWG Gameface is restarting the client', self.text)


RAMMER = 9001
QUICK_DEMOUNT_MENU = 'gui.Scaleform.daapi.view.lobby.tank_setup.context_menu.opt_device'


class DeviceSetup(object):
    # RU 1.45 gui_items/vehicle_equipment: a setup (preset) layout lists the device of every slot as intCDs.

    def __init__(self, *device_ids):
        self.device_ids = list(device_ids)

    def getIntCDs(self, default=0):
        return [device_id or default for device_id in self.device_ids]


def garage_tank(tank_id, name, tier, setups, **flags):
    layouts = instance('SetupLayouts', {'setups': dict(enumerate(setups))})
    devices = instance('OptDevices', {'setupLayouts': layouts})
    attrs = {'intCD': tank_id, 'shortUserName': name, 'level': tier, 'optDevices': devices}
    attrs.update(flags)
    return instance('Vehicle', attrs)


def device_menu_class():
    # RU 1.45 tank_setup/context_menu/opt_device.OptDeviceItemContextMenu, reduced to what the feature touches.

    class OptDeviceItemContextMenu(object):

        def __init__(self, device_id, vehicle):
            self._intCD = device_id
            self.vehicle = vehicle
            self.selected = []

        @classmethod
        def _makeItem(cls, optId, optLabel=None, optInitData=None, optSubMenu=None, linkage=None, iconType=''):
            return {'id': optId, 'label': optLabel, 'initData': optInitData, 'submenu': optSubMenu}

        def _generateOptions(self, ctx=None):
            return [self._makeItem('information', 'Information')]

        def onOptionSelect(self, optionId):
            self.selected.append(optionId)

        def _getVehicle(self):
            return self.vehicle

    return OptDeviceItemContextMenu


class QuickDemountTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        actions = []
        current = garage_tank(1, 'T-34', 5, [DeviceSetup(RAMMER, None, None)])
        tanks = [
            current,
            garage_tank(2, 'T-44', 8, [DeviceSetup(None, None, None), DeviceSetup(None, RAMMER, None)]),
            garage_tank(3, 'Obj. 140', 10, [DeviceSetup(None, None, RAMMER)]),
            garage_tank(4, 'T-54', 9, [DeviceSetup(RAMMER, None, None)], isInBattle=True),
            garage_tank(5, 'MS-1', 1, [DeviceSetup(None, None, None)]),
        ]
        by_id = {tank.intCD: tank for tank in tanks}
        rammer = instance('OptionalDevice', {'intCD': RAMMER})
        by_id[RAMMER] = rammer
        items = instance('Items', {
            'getVehicles': lambda items, criteria: {tank.intCD: tank for tank in tanks},
            'getItemByCD': lambda items, item_id: by_id.get(item_id),
        })
        items_cache = constants('IItemsCache', {})
        game.services[items_cache] = instance('ItemsCache', {'items': items})
        package('skeletons.gui.shared').IItemsCache = items_cache
        for name in ('gui.shared', 'gui.shared.utils', 'gui.shared.gui_items', 'gui.shared.gui_items.items_actions'):
            package(name)
        module('gui.shared.utils.requesters', REQ_CRITERIA=constants('REQ_CRITERIA', {'INVENTORY': 'inventory'}))
        module(
            'gui.shared.gui_items.items_actions.factory',
            REMOVE_OPT_DEVICE='removeOptDevice',
            doAction=lambda *args, **kwargs: actions.append((args, kwargs)),
        )
        for name in HANGAR_VIEW_PACKAGES[:5] + ('gui.Scaleform.daapi.view.lobby.tank_setup',
                                                 'gui.Scaleform.daapi.view.lobby.tank_setup.context_menu'):
            package(name)
        menu_class = device_menu_class()
        module(QUICK_DEMOUNT_MENU, OptDeviceItemContextMenu=menu_class)

        app = game.open_hangar()
        app.config.update({'hangar_quick_demount': True})
        menu = menu_class(RAMMER, current)
        cls.options = menu._generateOptions()
        entry = cls.options[-1]
        cls.submenu = [(item['id'], item['label'], item['initData']['enabled']) for item in entry['submenu']]
        menu.onOptionSelect('information')
        menu.onOptionSelect(entry['submenu'][1]['id'])
        menu.onOptionSelect(entry['submenu'][2]['id'])
        cls.selected = list(menu.selected)
        cls.actions = list(actions)
        app.config.update({'hangar_quick_demount': False})
        cls.options_off = menu._generateOptions()

    def test_the_device_menu_gets_the_quick_demount_entry_last(self):
        self.assertEqual(self.options[0]['id'], 'information')
        self.assertEqual(self.options[-1]['id'], 'otmetki_quick_demount')

    def test_the_other_carriers_are_listed_by_tier_and_a_tank_in_battle_cannot_be_picked(self):
        self.assertEqual([(entry_id, enabled) for entry_id, _, enabled in self.submenu], [
            ('otmetki_quick_demount:3', True),
            ('otmetki_quick_demount:4', False),
            ('otmetki_quick_demount:2', True),
        ])
        self.assertEqual(self.submenu[0][1], u'X  Obj. 140')

    def test_the_stock_options_still_reach_the_client(self):
        self.assertEqual(self.selected, ['information'])

    def test_picking_a_tank_runs_the_stock_demount_from_every_setup_and_a_tank_in_battle_is_refused(self):
        (args, kwargs), = self.actions
        action, vehicle, device, slot, destroy = args

        self.assertEqual((action, vehicle.intCD, device.intCD, slot, destroy), ('removeOptDevice', 2, RAMMER, 1, False))
        self.assertEqual(kwargs, {'forFitting': False, 'everywhere': True})

    def test_the_switch_off_leaves_the_stock_menu(self):
        self.assertEqual([option['id'] for option in self.options_off], ['information'])


ARMOR_VIEW_MENU = 'gui.Scaleform.daapi.view.lobby.hangar.hangar_cm_handlers'
ARMOR_TANK, CAROUSEL_TANK = 2849, 51809


def vehicle_menu_class():
    # RU 1.45 lobby/hangar/hangar_cm_handlers.VehicleContextMenuHandler, reduced to what the feature touches.

    class VehicleContextMenuHandler(object):

        def __init__(self, vehicle_id):
            self.vehCD = vehicle_id
            self.selected = []

        @classmethod
        def _makeItem(cls, optId, optLabel=None, optInitData=None, optSubMenu=None, linkage=None, iconType=''):
            return {'id': optId, 'label': optLabel}

        def _generateOptions(self, ctx=None):
            return [self._makeItem('vehicleInfo', 'Information')]

        def onOptionSelect(self, optionId):
            self.selected.append(optionId)

    return VehicleContextMenuHandler


class ArmorViewTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        cls.entries, cls.overlays, cls.external = [], [], []
        mods_list = instance('ModsListApi', {
            'addModification': lambda api, **entry: cls.entries.append(entry),
            'updateModification': lambda api, **entry: cls.entries.append(entry),
        })
        module('gui.modsListApi', g_modsListApi=mods_list)
        if 'gui.shared' not in sys.modules:
            package('gui.shared')
        module('gui.shared.event_dispatcher', showBrowserOverlayView=cls.overlays.append)
        sys.modules['BigWorld'].openWebBrowser = cls.external.append
        for name in HANGAR_VIEW_PACKAGES[:5]:
            if name not in sys.modules:
                package(name)
        menu_class = vehicle_menu_class()
        module(ARMOR_VIEW_MENU, VehicleContextMenuHandler=menu_class)
        game.vehicle.item = instance('Vehicle', {'intCD': ARMOR_TANK})

        app = game.open_hangar()
        cls.entry = dict(next(entry for entry in cls.entries if entry['id'] == 'otmetki_armor_view'))
        cls.entry.pop('callback')(None)
        menu = menu_class(CAROUSEL_TANK)
        cls.options = menu._generateOptions()
        menu.onOptionSelect('vehicleInfo')
        menu.onOptionSelect(cls.options[-1]['id'])
        cls.selected = list(menu.selected)
        cls.overlay_opens = list(cls.overlays)
        app.config.update({'hangar_armor_view': False})
        cls.options_off = menu._generateOptions()

    def test_its_own_mods_list_entry_is_in_the_lobby_only(self):
        self.assertEqual(self.entry['id'], 'otmetki_armor_view')
        self.assertEqual((self.entry['lobby'], self.entry['login'], self.entry['enabled']), (True, False, True))

    def test_the_mods_list_entry_opens_the_selected_tank_and_the_menu_item_the_carousel_tank(self):
        self.assertEqual([url.rsplit('/t/', 1)[1] for url in self.overlay_opens], ['2849/armor', '51809/armor'])

    def test_the_page_is_the_sites_own(self):
        self.assertTrue(self.overlay_opens[0].startswith('https://triotmetki.ru/'))

    def test_the_carousel_menu_gets_the_armour_item_last(self):
        self.assertEqual([option['id'] for option in self.options], ['vehicleInfo', 'otmetki_armor_view'])

    def test_the_stock_options_still_reach_the_client(self):
        self.assertEqual(self.selected, ['vehicleInfo'])

    def test_the_overlay_needs_no_external_browser(self):
        self.assertEqual(self.external, [])

    def test_the_switch_off_leaves_the_stock_menu(self):
        self.assertEqual([option['id'] for option in self.options_off], ['vehicleInfo'])


def research_tank():
    # RU 1.45 Vehicle.getUnlocksDescrs: (index, xpCost, nodeCD, required set); 31 a gun, 32 an engine, 41 the next tank.
    table = [(0, 20000, 31, set()), (1, 5000, 32, set()), (2, 60000, 41, {31})]

    def unlocks(vehicle):
        return iter(table)

    return instance('Vehicle', {'intCD': 1, 'xp': 15000, 'isElite': False, 'getUnlocksDescrs': unlocks})


class TankCardProgressTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        vehicle_type = 'vehicle'
        nodes = {
            31: instance('Gun', {'itemTypeID': 'gun', 'level': 8, 'shortUserName': 'D-10T'}),
            32: instance('Engine', {'itemTypeID': 'engine', 'level': 8, 'shortUserName': 'V-2-54'}),
            41: instance('Vehicle', {'itemTypeID': vehicle_type, 'level': 9, 'shortUserName': 'T-54'}),
        }
        stats = instance('RandomStats', {'getAvgXP': lambda stats: 1000})
        dossier = instance('Dossier', {'getRandomStats': lambda dossier: stats})
        items = instance('Items', {
            'stats': instance('Stats', {'unlocks': {1}}),
            'getItemByCD': lambda items, item_id: nodes.get(item_id),
            'getVehicleDossier': lambda items, tank_id: dossier,
        })
        items_cache = constants('IItemsCache', {})
        game.services[items_cache] = instance('ItemsCache', {'items': items})
        package('skeletons.gui.shared').IItemsCache = items_cache
        package('gui.shared')
        package('gui.shared.gui_items').GUI_ITEM_TYPE = constants('GUI_ITEM_TYPE', {'VEHICLE': vehicle_type})
        package('gui.techtree')
        tree = instance('TechTree', {'getBlueprintDiscountData': lambda tree, node_id, level, cost: (10, cost - 6000)})
        module('gui.techtree.techtree_dp', g_techTreeDP=tree)
        game.vehicle.item = research_tank()

        app = game.open_hangar(is_bound=True)
        game.hud_module().component_config(app).get('hangar_marks').update({'style': 'extended'})
        snapshot = dict(MOE_SNAPSHOT, mastery=2)
        app.marks.hangar_moe[1] = snapshot
        app.bus.emit('vehicle_moe', snapshot)
        read = [callback for method, url, headers, body, callback in game.fetches
                if method == 'GET' and url.endswith('/v1/moe/1')][0]
        read(response_json(dict(MOE_CURVE, mastery={'class3': 540, 'class2': 710, 'class1': 960, 'ace': 1320})))
        cls.card_text = game.hud_text('hangar_marks')

    def test_the_card_lists_the_xp_of_every_mastery_badge(self):
        for xp in ('540', '710', '960', '1 320'):
            self.assertIn(xp, self.card_text)

    def test_the_card_counts_the_xp_to_elite_with_the_blueprint_price_of_the_next_tank(self):
        self.assertIn('64 000 (~64', self.card_text)

    def test_the_card_counts_the_xp_to_the_next_tank_with_its_gun_and_the_battles_at_the_average(self):
        self.assertIn('T-54 59 000 (~59', self.card_text)


class ExactMoeChangeTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        app.marks.hangar_moe[1] = dict(HANGAR_MOE)
        results = _support.battle_results()
        game.enter_battle(results['arenaUniqueID'], 1)
        app.marks.hangar_moe[1] = dict(HANGAR_MOE, damage_rating=8712, moving_avg_damage=2610)
        game.back_to_hangar()
        game.events.onBattleResultsReceived(True, results)
        cls.messages = list(game.messages)
        cls.session_text = game.components['otmetki.session']['text']

    def test_the_hangars_post_battle_read_gives_the_exact_rating_the_results_round(self):
        self.assertTrue([text for text in self.messages if u'+1.12%' in text], self.messages)

    def test_the_session_card_shows_the_tanks_exact_change(self):
        self.assertIn(u'+1.12%', self.session_text)


class AccountExtrasTest(StoryTest):

    @classmethod
    def play(cls, game):
        game.install_hud_stubs()
        app = game.open_hangar(is_bound=True)
        app.config.update({switch: True for switch in (
            'hangar_depot_seller', 'hangar_auto_reserves', 'hangar_space', 'hangar_update_notice',
        )})
        instances = game.instances()
        cls.seller_actions = [action['id'] for action in instances['depot_seller'].ui_actions()]
        cls.seller_empty = instances['depot_seller'].ui_page()['empty']
        cls.seller_unset = app.translate('depot_seller_empty_unset')
        cls.reserves_refusal = instances['auto_reserves'].ui_action('activate_now')
        cls.space_rows = [row['id'] for row in instances['hangar_space'].ui_page()['rows']]
        cls.check_without_mods = instances['update_notice'].check()
        cls.play_update_check(game, instances['update_notice'])
        cls.play_onslaught_battle(game, instances['comp7_helper'])

    @classmethod
    def play_update_check(cls, game, notice):
        folder = os.path.join(game.game_dir, 'mods', '1.45.0.0')
        os.makedirs(folder)
        open(os.path.join(folder, 'net.triotmetki.core_0.1.0.mtmod'), 'w').close()
        cls.update_alerts = []
        notice.app.bus.on('mods_list_alert', cls.update_alerts.append)
        notice.check()
        fetches = game.fetches_to('/modpack/releases/latest?game=1.45.0.0')
        cls.update_fetches = len(fetches)
        release = {'version': '0.2.0', 'notes': {'ru': u'Новое', 'en': u'New'}, 'packages': [
            {'id': 'core', 'file': 'net.triotmetki.core_0.2.0.mtmod'},
        ]}
        fetches[0][4](response_json({'status': 'compatible', 'release': release}))
        game.run_callbacks()
        cls.update_messages = [text for text in game.messages if '0.2.0' in text]
        cls.update_card = 'otmetki.update_notice' in game.components
        cls.skip_notice = notice.ui_action('skip_version')

    @classmethod
    def play_onslaught_battle(cls, game, helper):
        comp7 = game.install_onslaught_services()
        module('skeletons.gui.game_control', IComp7Controller=comp7)
        results = _support.battle_results()
        results['common'].pop('guiType', None)
        results['common']['bonusType'] = 43
        game.enter_battle(results['arenaUniqueID'], 1)
        game.back_to_hangar()
        game.events.onBattleResultsReceived(True, results)
        game.vehicle.item = instance('Vehicle', {'intCD': 1})
        helper.refresh()
        cls.comp7_history = list(helper.history)
        cls.comp7_text = game.components['otmetki.comp7_helper']['text']

    def test_the_depot_seller_sells_nothing_until_a_category_is_on(self):
        self.assertEqual(self.seller_actions, ['refresh'])
        self.assertEqual(self.seller_empty, self.seller_unset)

    def test_auto_reserves_refuse_without_a_chosen_reserve(self):
        self.assertEqual(self.reserves_refusal['kind'], 'error')

    def test_the_hangar_space_page_starts_with_the_game_hangar(self):
        self.assertEqual(self.space_rows, ['native'])

    def test_the_update_notice_needs_installed_packages(self):
        self.assertFalse(self.check_without_mods)

    def test_the_update_notice_asks_the_release_index_once_and_sends_one_message_without_a_card(self):
        self.assertEqual(self.update_fetches, 1)
        self.assertEqual(len(self.update_messages), 1)
        self.assertFalse(self.update_card)

    def test_the_update_puts_the_mods_list_badge_on_and_a_skipped_version_takes_it_off(self):
        self.assertEqual(self.skip_notice['kind'], 'info')
        self.assertEqual(self.update_alerts, [True, False])

    def test_an_onslaught_battle_is_kept_for_the_card(self):
        self.assertEqual(len(self.comp7_history), 1)
        self.assertIn('+', self.comp7_text)


class Vector4(object):

    def __init__(self, x, y, z, w):
        self.x, self.y, self.z, self.w = x, y, z, w


class HullAtOrigin(object):
    # RU 1.45 Math.Matrix over the own vehicle's matrix provider: here the hull stands at the origin facing +z.

    def __init__(self, provider):
        self.translation = Vector(0.0, 0.0, 0.0)
        self.yaw = 0.0


class CameraAlongZ(object):
    # A camera at the origin looking along +z: the clip-space w is the depth, so a point lands at x / z of the screen.

    @staticmethod
    def applyV4Point(point):
        return Vector4(point.x, point.y, point.z, point.z)


class Vector(object):
    # RU 1.45 Math.Vector3: what the rotator's marker update hands the crosshair proxy as the hit point.

    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

    def __sub__(self, other):
        return Vector(self.x - other.x, self.y - other.y, self.z - other.z)

    @property
    def length(self):
        return (self.x ** 2 + self.y ** 2 + self.z ** 2) ** 0.5


def crosshair_proxy():
    proxy = instance('CrosshairDataProxy', {
        'getViewID': lambda proxy: proxy.view_id,
        'getScaledPosition': lambda proxy: proxy.screen['position'],
        'getSize': lambda proxy: proxy.screen['size'],
        'getScaleFactor': lambda proxy: proxy.screen['scale'],
    })
    proxy.view_id = ARCADE_VIEW
    proxy.screen = dict(RETICLE_SCREEN)
    proxy.onGunMarkerStateChanged = Event()
    proxy.onCrosshairViewChanged = Event()
    proxy.onCrosshairPositionChanged = Event()
    return proxy


class UnreadableResultsTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_hangar()
        cls.announced = []
        app.bus.on('battle_results', lambda arena_id, results: cls.announced.append(arena_id))
        results = _support.battle_results()
        results['personal'] = {'avatar': results['personal']['avatar']}
        cls.arena_id = results['arenaUniqueID']
        game.events.onBattleResultsReceived(True, copy.deepcopy(results))
        game.events.onBattleResultsReceived(True, copy.deepcopy(results))

    def test_results_no_event_can_be_built_from_are_announced_once(self):
        self.assertEqual(self.announced, [self.arena_id])


class AccountSwitchTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_hangar()
        cls.loads = []
        app.register_account_state('probe', lambda: 'kept by %d' % app.account_id, cls.loads.append)
        app.marks.hangar_moe[OTHER_TANK] = dict(MOE_SNAPSHOT)
        instances = game.instances()
        game.events.onBattleResultsReceived(True, _support.battle_results())
        cls.results_before = len(instances['battle_results'].history)
        cls.session_before = instances['session_stats'].session.session_id
        game.player = Player(OTHER_ACCOUNT)
        game.events.onAccountShowGUI()
        cls.moe_tanks = sorted(app.marks.hangar_moe)
        cls.results_after = len(instances['battle_results'].history)
        cls.session_after = instances['session_stats'].session.session_id
        cls.saved = _support.load_json(os.path.join(app.config_dir, 'state.json'))

    def test_another_account_starts_without_the_first_ones_state_part(self):
        self.assertIsNone(self.loads[-1])

    def test_the_first_accounts_part_is_kept_under_its_id(self):
        self.assertEqual(self.saved['accounts'][str(ACCOUNT)]['probe'], 'kept by %d' % ACCOUNT)

    def test_another_account_starts_without_the_first_ones_moe_snapshots(self):
        self.assertNotIn(OTHER_TANK, self.moe_tanks)

    def test_the_first_account_had_a_battle_in_its_results_and_session(self):
        self.assertEqual((self.results_before, bool(self.session_before)), (1, True))

    def test_another_account_starts_without_the_first_ones_battle_results(self):
        self.assertEqual(self.results_after, 0)

    def test_another_account_starts_without_the_first_ones_session(self):
        self.assertIsNone(self.session_after)


def broken_capture(*args):
    raise RuntimeError('capture')


class CaptureFailureTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_hangar()
        cls.heard = []
        for name in ('battle_enter', 'battle_ready', 'battle_leave', 'hangar', 'tick'):
            app.bus.on(name, lambda *args, **kwargs: None)
            app.bus.on(name, cls.recorder(name))
        for step in ('on_battle_ready', 'on_battle_leave', 'on_hangar', 'poll_pending_results'):
            setattr(app.battles, step, broken_capture)
        game.enter_battle(1)
        game.back_to_hangar()
        game.run_callbacks()

    @classmethod
    def recorder(cls, name):
        return lambda *args: cls.heard.append(name)

    def test_a_failing_battle_capture_still_tells_the_features_the_battle_began(self):
        self.assertIn('battle_ready', self.heard)

    def test_a_failing_battle_capture_still_tells_the_features_the_battle_ended(self):
        self.assertIn('battle_leave', self.heard)

    def test_a_failing_hangar_capture_still_tells_the_features_the_hangar_is_shown(self):
        self.assertEqual(self.heard.count('hangar'), 1)

    def test_a_failing_results_poll_still_ticks_the_hangar(self):
        self.assertIn('tick', self.heard)


class HeldSaveTest(StoryTest):

    @classmethod
    def play(cls, game):
        app = game.open_hangar()
        path = os.path.join(app.config_dir, 'components.json')
        game.enter_battle(1)
        config = game.hud_module().component_config(app)
        held_before = cls.held_saves(game)
        for x in range(70, 78):
            config.update('damage_log', {'x': x})
        cls.saves_asked = cls.held_saves(game) - held_before
        cls.saved_in_battle = _support.load_json(path)['damage_log']['x']
        game.events.onAvatarBecomeNonPlayer()
        cls.saved_after_battle = _support.load_json(path)['damage_log']['x']

    @staticmethod
    def held_saves(game):
        return len([callback for callback in game.callbacks if getattr(callback, '__name__', None) == '_on_due'])

    def test_a_change_in_battle_is_not_written_at_once(self):
        self.assertNotEqual(self.saved_in_battle, 77)

    def test_changes_in_battle_ask_for_one_held_save_at_most(self):
        self.assertLessEqual(self.saves_asked, 1)

    def test_the_end_of_the_battle_writes_the_last_change(self):
        self.assertEqual(self.saved_after_battle, 77)


class GunArcRedrawTest(StoryTest):

    @classmethod
    def play(cls, game):
        app, _ = open_shots_hangar(game)
        session = game.enter_battle_with_gun((-0.26, 0.26))
        GunAndWoundsTest.play_gun_arc(game, app, session)
        layer = game.hud_module().hud_layer(app)
        arc = game.instances()['gun_arc']
        shows = []
        show = arc.show
        arc.show = lambda text, widget=None: shows.append(widget) or show(text, widget)
        arc.render()
        cls.shows_while_still = len(shows)
        session.shared.crosshair.screen = dict(RETICLE_SCREEN, position=(1000, 540))
        arc.render()
        cls.shows_after_the_reticle_moved = len(shows)
        arc._marks_on_screen = lambda screen: None
        arc.render()
        cls.arc_off_canvas = copy.deepcopy(layer.widgets.get('otmetki.hud.gun_arc'))
        game.events.onAvatarBecomeNonPlayer()
        cls.ticks_on_in_hangar = arc._on_tick()

    def test_a_still_tank_and_camera_send_nothing_new(self):
        self.assertEqual(self.shows_while_still, 0)

    def test_a_moved_reticle_draws_the_markers_again(self):
        self.assertEqual(self.shows_after_the_reticle_moved, 1)

    def test_markers_off_the_canvas_keep_the_panel_with_no_marks(self):
        data = self.arc_off_canvas['data']

        self.assertEqual((data['left'], data['right'], data['centre']), (None, None, None))

    def test_the_tick_stops_outside_a_battle(self):
        self.assertFalse(self.ticks_on_in_hangar)


if __name__ == '__main__':
    unittest.main()
