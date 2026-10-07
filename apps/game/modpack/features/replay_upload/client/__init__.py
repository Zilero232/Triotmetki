from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.game import client_attr
from ....core.client.native import read_settings
from ....core.client.replays import DEFAULT_REPLAY_DIR, replay_dir
from ....core.events import EVENT_REPLAY_UPLOAD_REQUEST, EVENT_REPLAY_UPLOADED
from ....core.log import log, safe
from ....core.net.transport import BackgroundRunner, SyncTransport
from ....core.storage import account_file
from ..model import Endpoint, ReplayFiles, ReplayQueue, ReplayUploader, battle_started_at, find_replay
from ..model.constants import (
    REQUEST_INVALID,
    REQUEST_OFF,
    REQUEST_READY,
    REQUEST_UNBOUND,
    UPLOAD_PATH,
    VISIBILITY_PRIVATE,
    VISIBILITY_PUBLIC,
)
from ..settings import PUBLISH, SWITCH
from .constants import QUEUE_FILE, REPLAY_SETTING, STARTED_KEEP, UPLOAD_RESPONSE_MAX_BYTES, UPLOAD_TIMEOUT_S


def game_records_replays():
    value = (read_settings((REPLAY_SETTING,)) or {}).get(REPLAY_SETTING)
    if value is None:
        return None
    try:
        return int(value) != 0
    except (TypeError, ValueError):
        return None


def server_to_local(server_time):
    convert = client_attr('helpers.time_utils', 'makeLocalServerTime')
    if convert is None:
        return server_time
    return convert(server_time)


# Never turns replay recording on: only files the client already wrote, opt-in, in the hangar.
class ReplayAutoUpload(object):

    def __init__(self, app):
        self.app = app
        self.config_dir = app.config_dir
        self.runner = BackgroundRunner('otmetki-replays')
        self.transport = SyncTransport(timeout=UPLOAD_TIMEOUT_S, max_bytes=UPLOAD_RESPONSE_MAX_BYTES)
        self.queue = None
        self.uploader = None
        self.started = {}
        self.folder = DEFAULT_REPLAY_DIR
        self.in_battle = False
        bus = app.bus
        bus.on('account', self.on_account)
        bus.on('rebind', self.on_rebind)
        bus.on('battle_start', self.on_battle_start)
        bus.on('battle_enter', self.on_battle_enter)
        bus.on('hangar', self.on_hangar)
        bus.on('battle_results', self.on_battle_result)
        bus.on('tick', self.tick)
        bus.on(EVENT_REPLAY_UPLOAD_REQUEST, self.on_request)
        if app.account_id:
            self.on_account(app.account_id)

    def _enabled(self):
        return self.app.config.is_enabled(SWITCH) and self.app.is_bound() and not self.app.auth_failed

    def _endpoint(self):
        is_public = self.app.config.is_enabled(PUBLISH)
        return Endpoint(
            transport=self.transport,
            url=self.app.config.endpoint(UPLOAD_PATH),
            user_agent=self.app.user_agent(),
            credentials=self.app.current_credentials(),
            visibility=VISIBILITY_PUBLIC if is_public else VISIBILITY_PRIVATE,
        )

    def on_account(self, account_id):
        self.queue = ReplayQueue(account_file(self.config_dir, QUEUE_FILE, account_id))
        self.uploader = ReplayUploader(
            queue=self.queue,
            endpoint=self._endpoint(),
            files=ReplayFiles(find=self._find),
            runner=self.runner,
            clock=time.time,
            listener=self,
        )
        if self.in_battle:
            self.uploader.pause()

    def on_rebind(self):
        if self.queue is not None:
            self.queue.unblock()

    def on_battle_enter(self):
        self.in_battle = True
        if self.uploader is not None:
            self.uploader.pause()

    def on_hangar(self):
        self.in_battle = False
        if self.uploader is not None:
            self.uploader.resume()

    def on_battle_start(self, arena_unique_id):
        if arena_unique_id:
            self.started[arena_unique_id] = time.time()
            for stale in sorted(self.started, key=self.started.get)[:-STARTED_KEEP]:
                del self.started[stale]

    def on_battle_result(self, arena_unique_id, results):
        started_at = self.started.pop(arena_unique_id, None)
        if self.queue is None or not self._enabled():
            return
        if game_records_replays() is False:
            return
        started_at = battle_started_at(started_at, results, server_to_local)
        if self.queue.add(arena_unique_id, self.app.account_id, started_at, time.time()):
            log('replay queued for upload: %s' % arena_unique_id)

    def on_request(self, request, reply):
        reply(self._request_state(request))

    def _request_state(self, request):
        if not self.app.config.is_enabled(SWITCH):
            return REQUEST_OFF
        if not self.app.is_bound() or self.app.auth_failed or self.queue is None:
            return REQUEST_UNBOUND
        if request is None:
            return REQUEST_READY
        if request.get('account_id') != self.app.account_id:
            return REQUEST_INVALID
        return self.queue.request(
            request.get('arena_unique_id'),
            request.get('account_id'),
            request.get('started_at'),
            time.time(),
        )

    def _find(self, item):
        return find_replay(self.folder, item['account_id'], item['arena_unique_id'], item.get('started_at'))

    def on_auth_failed(self):
        self.app.on_auth_failed()

    @safe
    def on_uploaded(self, arena_unique_id, replay_id):
        log('replay uploaded: %s' % arena_unique_id)
        self.app.bus.emit(EVENT_REPLAY_UPLOADED, arena_unique_id, replay_id)

    def tick(self, now):
        self.runner.poll()
        if self.uploader is None or not self._enabled():
            return
        self.uploader.endpoint = self._endpoint()
        self.folder = replay_dir()
        self.uploader.tick(now)
