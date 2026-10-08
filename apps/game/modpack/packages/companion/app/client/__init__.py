"""The companion app: a thin host that wires client events to the companion's capture modules and to
the features attached through the core registry.

Events on `app.bus` (features subscribe to these; see CLAUDE.md for the host interface):
    account(account_id)          the outbox switched to this account
    rebind()                     credentials changed, paused queues may resume
    hangar()                     the hangar GUI is shown
    vehicle_moe(snapshot)        MoE snapshot of the vehicle selected in the hangar
    enqueued()                   the player joined a battle queue
    dequeued()                   the player left the queue
    battle_enter()               an avatar is ready (own battle or replay playback)
    battle_start(arena_id)       own battle started (never a replay)
    battle_ready(player)         own battle set up (never a replay)
    battle_leave()               the avatar left
    battle_results(arena_id, results)
    battle_event(event, now)     the battle_result event before it is queued
    battle_recorded()            a battle result was recorded
    ingest_response(data)        a 2xx body from /mod/ingest
    tick(now)                    once a second, hangar only

State in state.json: `register_state(key, dump)` keeps a part shared by every account (read it from `app.state`);
`register_account_state(key, dump, load)` keeps one per account (`companion.account_state`): `load(value)` gets the
current account's value (None when it has none) at once when the account is known and again on every account switch,
before the `account` event, so a session or a battle history never carries over to another account.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import time

import BattleReplay
import BigWorld
from PlayerEvents import g_playerEvents

from ....core.client.battle import own_account_id
from ....core.client.game import client_language, client_version, on_vehicle_changed
from ....core.client.native import repair_detection_sound
from ....core.client.packaging import warn_mixed_install
from ....core.client.session_log import open_session_log
from ....core.client.storage import deferred, flush_all_writes, flush_writes
from ....core.client.timer import Ticker
from ....core.client.transport import create_transport
from ....core.client.ui import Ui
from ....core.events import EventBus
from ....core.hooks import Subscriptions
from ....core.durable import open_config, open_secret_pair, secret_box
from ....core.log import flush_file, log, safe
from ....core.net.transport import tls_available
from ....core.registry import registry
from ....core.storage import JsonFile
from ....core.version import VERSION as CORE_VERSION
from ...account_state import AccountState
from ...battles.client import BattleCapture
from ...binding import CredentialStore
from ...binding.client import Binder
from ...capture.client import start_capture
from ...config import Config, is_dev_install
from ...config.client import migrate_stored
from ...i18n import Translator, resolve_language
from ...marks.client import MarksCapture
from ...outbox import Outbox
from ...sender import INGEST_PATH, IngestEndpoint, IngestSender
from ...settings_share.client import SettingsShare
from ...settings_ui.client import SettingsView
from ...version import MOD_ID, VERSION
from ..constants import CONFIG_DIR, CREDENTIALS_FILE, TICK_S


def _path(name):
    return os.path.join(CONFIG_DIR, name)


def _credential_store():
    store = CredentialStore(open_secret_pair(CONFIG_DIR, CREDENTIALS_FILE), secret_box())
    store.migrate()
    return store


def _step(action, *args):
    safe(action)(*args)


def _stored_object(storage):
    stored = storage.read({})
    return stored if isinstance(stored, dict) else {}


class OtmetkiApp(object):

    def __init__(self):
        open_session_log(CONFIG_DIR, ((MOD_ID, VERSION), ('core', CORE_VERSION)))
        self.config_dir = CONFIG_DIR
        self.bus = EventBus()
        self.hooks = Subscriptions()
        self.config_file = deferred(open_config(CONFIG_DIR, 'config.json', pretty=True))
        stored_config = self.config_file.read({})
        self.config = Config(migrate_stored(CONFIG_DIR, stored_config), allow_custom_server=is_dev_install())
        self.save_config()
        self.translate = Translator(resolve_language(self.config.get('language'), client_language()))
        self.credentials = _credential_store()
        self.state_file = deferred(open_config(CONFIG_DIR, 'state.json'))
        self.state = _stored_object(self.state_file)
        self.state_parts = []
        self.account_state = AccountState()
        self.transport = create_transport()
        self.account_id = None
        self.outbox = None
        self.sender = None
        self.auth_failed = False
        self.in_battle = False
        self.last_flush = 0.0
        self.flush_requested = False
        self.ui = Ui()
        self.binder = Binder(self)
        self.marks = MarksCapture(self)
        self.battles = BattleCapture(self)
        self.settings_ui = SettingsView(self)
        self.settings_share = SettingsShare(self)
        self.ticker = Ticker(TICK_S, self._tick)

    def start(self):
        hooks = self.hooks
        hooks.add(g_playerEvents, 'onAccountShowGUI', self._on_account_show_gui)
        hooks.add(g_playerEvents, 'onEnqueued', self._on_enqueued)
        hooks.add(g_playerEvents, 'onDequeued', self._on_dequeued)
        hooks.add(g_playerEvents, 'onArenaCreated', self._on_arena_created)
        hooks.add(g_playerEvents, 'onAvatarReady', self._on_avatar_ready)
        hooks.add(g_playerEvents, 'onAvatarBecomeNonPlayer', self._on_avatar_leave)
        hooks.add(g_playerEvents, 'onBattleResultsReceived', self._on_battle_results)
        if hasattr(g_playerEvents, 'onDisconnected'):
            hooks.add(g_playerEvents, 'onDisconnected', flush_all_writes)
        on_vehicle_changed(self._on_vehicle_changed, 'companion')
        self.settings_ui.register()
        self.ticker.start()
        log('started %s' % VERSION)
        warn_mixed_install()
        registry().bind(self)
        self.capture = start_capture(self, is_dev_install())

    def stop(self):
        """The client is closing: write the settings saves still held back (`core.client.storage`)."""
        log('stopping: writing the held saves')
        flush_all_writes()
        flush_file()

    def user_agent(self):
        return '%s/%s' % (MOD_ID, VERSION)

    def save_config(self):
        self.config_file.write(self.config.to_dict())

    def register_state(self, key, dump):
        self.state_parts.append((key, dump))

    def register_account_state(self, key, dump, load):
        self.account_state.register(self.state, key, dump, load)

    def save_state(self):
        data = dict(self.state)
        for key, dump in self.state_parts:
            data[key] = dump()
        data = self.account_state.saved(data)
        self.state = data
        self.state_file.write(data)

    def current_credentials(self):
        if self.account_id is None:
            return None
        return self.credentials.get(self.account_id)

    def is_bound(self):
        return self.current_credentials() is not None

    def status_text(self):
        if tls_available() is False:
            return self.translate('status_tls_unavailable')
        if self.auth_failed:
            return self.translate('status_auth_failed')
        if self.is_bound():
            return self.translate('status_bound', account_id=self.account_id)
        return self.translate('status_unbound')

    def enqueue(self, event):
        if self.outbox is None or not self.is_bound() or not self.config.get('enabled'):
            return False
        return self.outbox.enqueue(event)

    def bind(self, raw_code):
        self.binder.bind(raw_code)

    def rebuild_sender(self):
        self.auth_failed = False
        if self.outbox is None:
            self.sender = None
            return
        self.outbox.unblock()
        self.bus.emit('rebind')
        endpoint = IngestEndpoint(
            url=self.config.endpoint(INGEST_PATH),
            user_agent=self.user_agent(),
            mod_version=VERSION,
            client_version=client_version(),
        )
        self.sender = IngestSender(
            self.outbox,
            self.current_credentials(),
            self.transport,
            endpoint,
            on_response=self._on_ingest_response,
            on_auth_failed=self.on_auth_failed,
            clock=time.time,
        )

    @safe
    def on_auth_failed(self):
        self.auth_failed = True
        self.ui.notify(self.translate('status_auth_failed'))
        self.settings_ui.refresh()

    def _switch_account(self, account_id):
        self.state = self.account_state.switch(self.state, account_id)
        self.account_id = account_id
        _step(self.save_state)
        self.outbox = Outbox(JsonFile(_path('outbox_%d.json' % account_id)))
        self.bus.emit('account', account_id)
        self.rebuild_sender()

    def _tick(self):
        _step(self.transport.poll)
        flush_file()
        if self.in_battle:
            return
        now = time.time()
        _step(self.battles.poll_pending_results, now)
        if self._is_flush_due(now):
            self.flush_requested = False
            self.last_flush = now
            _step(self.sender.tick, now)
        _step(self.settings_share.tick, now)
        self.bus.emit('tick', now)

    def _is_flush_due(self, now):
        if self.sender is None:
            return False
        interval = self.config.get('flush_interval_seconds')
        return self.flush_requested or now - self.last_flush >= interval

    def _on_account_show_gui(self, *args):
        log('hangar shown')
        account_id = getattr(BigWorld.player(), 'databaseID', None)
        if account_id and account_id != self.account_id:
            _step(self._switch_account, account_id)
        _step(self.binder.bind_from_config)
        self._on_vehicle_changed()
        _step(self.battles.on_hangar)
        self.bus.emit('hangar')
        self.settings_ui.refresh()
        self.settings_share.on_hangar()
        safe(repair_detection_sound)()
        flush_all_writes()

    @safe
    def _on_ingest_response(self, data):
        self.bus.emit('ingest_response', data)

    @safe
    def _on_vehicle_changed(self, *args):
        if not self.in_battle:
            self.marks.on_vehicle_changed()

    def _on_enqueued(self, queue_type, *args):
        _step(self.battles.on_enqueued, queue_type)
        self.bus.emit('enqueued')

    def _on_dequeued(self, queue_type, *args):
        _step(self.battles.on_dequeued)
        self.bus.emit('dequeued')

    def _on_arena_created(self, *args):
        self.battles.on_arena_created()

    def _on_avatar_ready(self, *args):
        self.in_battle = True
        replay = BattleReplay.isPlaying()
        log('battle entered%s' % (' (replay)' if replay else ''))
        flush_writes()
        self.bus.emit('battle_enter')
        if replay:
            return
        player = BigWorld.player()
        self._account_from_arena(player)
        _step(self.battles.on_battle_ready, player)
        self.bus.emit('battle_ready', player)

    # A crashed client reconnects straight into the battle with no hangar: the arena data names the account.
    def _account_from_arena(self, player):
        if self.account_id is not None:
            return
        account_id = own_account_id(player)
        if account_id:
            log('account %s taken from the battle (no hangar before it)' % account_id)
            _step(self._switch_account, account_id)

    def _on_avatar_leave(self, *args):
        self.in_battle = False
        log('battle left')
        _step(self.battles.on_battle_leave)
        self.bus.emit('battle_leave')
        flush_writes()

    def _on_battle_results(self, is_player_vehicle, results):
        self.battles.on_battle_results(is_player_vehicle, results)


g_app = None


def start():
    global g_app
    if g_app is None:
        g_app = OtmetkiApp()
        g_app.start()
    return g_app


def stop():
    if g_app is not None:
        g_app.stop()
