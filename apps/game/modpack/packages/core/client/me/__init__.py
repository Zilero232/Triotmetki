"""The bound account's own reads from the site on the app's transport: `post_signed` (one signed /mod/me
request) and `tank_ratings(app)`, the process-wide read of the player's own tank rows (`/mod/me/tanks`:
ratings, career records, WN8 expected values), shared by the features that show them so each tank is read
once per game session and again after its own battles."""
from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ...codec import encode_json, parse_json_body, parse_retry_after
from ...errors import ReasonError
from ...events import Listeners
from ...log import log, safe
from ...me import (
    OK_STATUS,
    REFRESH_AFTER_BATTLE_S,
    TANKS_PATH,
    ReadState,
    device_body,
    is_auth_failure,
    retry_delay,
    tank_key,
    tank_rows,
    tanks_request,
)
from ...me.constants import MAX_WATCHED_TANKS
from ...net.signing import SignedRequest, signed_request
from ...vendor import attr

_state = {'service': None}


def can_read(app):
    """True in the hangar of a bound account whose device the server has not refused."""
    return app.is_bound() and not app.auth_failed and not app.in_battle


def post_signed(app, path, payload, on_done):
    """POSTs `payload` to `path` signed with the bound device (raises ReasonError('not_bound') without one).
    `on_done(status, data, retry_after)` gets the JSON object of a 200 answer (else None); a 401/403 also
    pauses the app like the outbox does (`on_auth_failed`, the rebind notice)."""
    credentials = app.current_credentials()
    if credentials is None or not credentials.is_valid():
        raise ReasonError('not_bound')

    @safe
    def done(status, body, headers):
        if is_auth_failure(status):
            app.on_auth_failed()
        data = parse_json_body(body) if status == OK_STATUS else None
        on_done(status, data, parse_retry_after(headers))

    request = SignedRequest(
        method='POST',
        url=app.config.endpoint(path),
        device_id=credentials.device_id,
        secret=credentials.secret,
        body=encode_json(payload),
        user_agent=app.user_agent(),
    )
    signed_request(app.transport, request, done)


@attr.s(frozen=True)
class SignedRead(object):
    """What `signed_read` reads: `build()` is the payload POSTed to `path` while `key` of `reads` (a ReadState) is
    pending; `account_of()` names the account the answer is for."""

    reads = attr.ib()
    key = attr.ib()
    path = attr.ib()
    build = attr.ib()
    account_of = attr.ib()


def signed_read(app, read, on_data, on_end=None):
    """One keyed read of the bound account's own data (`read`, a SignedRead). A ReasonError from `read.build()` skips
    the read and is logged. An answer that arrives after `read.account_of()` changed is dropped; a 200 marks the key
    done and gets `on_data(data, account_id)`, any other status backs the key off (`retry_delay`); `on_end()` runs
    after either. Returns True when the request went out."""
    try:
        payload = read.build()
    except ReasonError as error:
        log('%s not requested: %s' % (read.path, error.reason))
        return False
    account_id = read.account_of()
    keys = [read.key]
    read.reads.start(keys)

    def done(status, data, retry_after):
        if read.account_of() != account_id:
            return

        if status == OK_STATUS:
            read.reads.done(keys)
            on_data(data, account_id)
        else:
            read.reads.fail(keys, time.time(), retry_delay(status, retry_after))
        if on_end is not None:
            on_end()

    post_signed(app, read.path, payload, done)
    return True


def signed_body(app, **fields):
    """{device_id, account_id} of the bound device plus `fields`."""
    body = device_body(app.current_credentials())
    body.update(fields)
    return body


class TankRatings(object):

    def __init__(self, app):
        self.app = app
        self.account_id = app.account_id
        self.rows = {}
        self.reads = ReadState()
        self.watched = []
        self.listeners = Listeners('tank ratings listener')
        bus = app.bus
        bus.on('account', self._on_account)
        bus.on('rebind', self._on_rebind)
        bus.on('battle_event', self._on_battle_event)
        bus.on('tick', self._on_tick)

    def listen(self, callback):
        self.listeners.add(callback)

    def row(self, tank_id):
        return self.rows.get(tank_id)

    def _on_account(self, account_id):
        self.account_id = account_id
        self.rows = {}
        self.reads.reset()

    def _on_rebind(self):
        self._on_account(self.app.account_id)

    def _on_battle_event(self, event, now):
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        if tank_id:
            self.reads.stale([tank_key(tank_id)], now, REFRESH_AFTER_BATTLE_S)

    def _on_tick(self, now):
        for tank_id in list(self.watched):
            self.ensure(tank_id, now)

    def ensure(self, tank_id, now=None):
        if not tank_id or not can_read(self.app):
            return False
        self._watch(tank_id)
        now = time.time() if now is None else now
        key = tank_key(tank_id)
        if not self.reads.wants(key, now):
            return False

        def store(data, account_id):
            rows = tank_rows(data, account_id)
            if tank_id in rows:
                self.rows[tank_id] = rows[tank_id]

        read = SignedRead(
            reads=self.reads,
            key=key,
            path=TANKS_PATH,
            build=lambda: tanks_request(self.app.current_credentials(), [tank_id]),
            account_of=lambda: self.account_id,
        )
        return signed_read(self.app, read, store, lambda: self._notify(tank_id))

    def _watch(self, tank_id):
        if tank_id in self.watched:
            self.watched.remove(tank_id)
        self.watched.append(tank_id)
        del self.watched[:-MAX_WATCHED_TANKS]

    def _notify(self, tank_id):
        self.listeners.notify(tank_id)


def tank_ratings(app):
    """The process-wide tank read (created on first use, so features need no load order)."""
    if _state['service'] is None or _state['service'].app is not app:
        _state['service'] = TankRatings(app)
    return _state['service']
