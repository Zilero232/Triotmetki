from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ...core.compat import is_int, string_types, to_text
from ...core.errors import ReasonError
from ...core.log import log
from ...core.vendor import attr
from .constants import (  # noqa: F401
    BIND_PATH,
    CODE_PATTERN,
    CODE_SEPARATORS,
    MIN_SECRET_LENGTH,
    PUBLIC_FIELDS,
    REASON_NO_ACCOUNT,
    SEALED_FIELD,
)


class BindError(ReasonError):
    pass


def normalize_code(raw):
    if not isinstance(raw, string_types):
        return None
    code = CODE_SEPARATORS.sub('', to_text(raw)).upper()
    if CODE_PATTERN.match(code):
        return str(code)
    return None


def build_bind_request(code, account_id, mod_version, client_version, realm):
    normalized = normalize_code(code)
    if normalized is None:
        raise BindError('invalid_code')
    if not is_int(account_id) or account_id <= 0:
        raise BindError(REASON_NO_ACCOUNT)
    return {
        'code': normalized,
        'account_id': account_id,
        'mod_version': mod_version,
        'client_version': client_version or '',
        'realm': realm,
    }


@attr.s
class Credentials(object):

    device_id = attr.ib()
    secret = attr.ib()
    account_id = attr.ib()
    bound_at = attr.ib(default=None)

    def is_valid(self):
        has_device = isinstance(self.device_id, string_types) and len(self.device_id) > 0
        has_secret = isinstance(self.secret, string_types) and len(self.secret) >= MIN_SECRET_LENGTH
        has_account = is_int(self.account_id) and self.account_id > 0
        return has_device and has_secret and has_account

    def to_dict(self):
        return attr.asdict(self)

    @classmethod
    def from_dict(cls, data):
        if not isinstance(data, dict):
            return None
        credentials = cls(data.get('device_id'), data.get('secret'), data.get('account_id'), data.get('bound_at'))
        return credentials if credentials.is_valid() else None


def parse_bind_response(data, expected_account_id, now=None):
    if not isinstance(data, dict):
        raise BindError('bad_response')
    if data.get('error'):
        raise BindError(to_text(data.get('error')))
    account_id = data.get('account_id')
    if account_id != expected_account_id:
        raise BindError('account_mismatch')
    bound_at = int(now if now is not None else time.time())
    credentials = Credentials(data.get('device_id'), data.get('secret'), account_id, bound_at)
    if not credentials.is_valid():
        raise BindError('bad_response')
    return credentials


def _accounts(storage):
    data = storage.read({}) if storage is not None else {}
    accounts = data.get('accounts') if isinstance(data, dict) else None
    return accounts if isinstance(accounts, dict) else {}


def _public_entry(credentials):
    entry = {'device_id': credentials.device_id, 'account_id': credentials.account_id}
    if credentials.bound_at is not None:
        entry['bound_at'] = credentials.bound_at
    return entry


def _has_legacy_fields(entry):
    return isinstance(entry, dict) and bool(set(entry) - set(PUBLIC_FIELDS))


# The bindings per account, split in two (README "Durable settings"): the game-folder `credentials.json` holds only
# `{device_id, account_id}`, the %APPDATA% copy adds `secret_dpapi`, the secret sealed for this Windows user. A
# plaintext `secret` of an older version is taken once and both halves are rewritten at once (so is a game-folder copy
# that is missing or carries other fields); plaintext is never written. A sealed secret that does not open (a roaming
# profile not synced yet, a DPAPI failure) is no binding for now, but both its halves are kept as they are and it is
# tried again on the next start. Without DPAPI or a durable folder a new binding lasts for the session only.
class CredentialStore(object):
    def __init__(self, pair, box):
        self.public = pair.public
        self.private = pair.private
        self.box = box
        self.session = {}
        self.unopened = {}
        self.reported = set()

    def _load(self):
        public = _accounts(self.public)
        private = _accounts(self.private)
        stored = {}
        self.unopened = {}
        plaintext = False
        for key in set(public) | set(private):
            entry = private.get(key) if isinstance(private.get(key), dict) else {}
            secret = self.box.open(entry.get(SEALED_FIELD))
            if secret is None:
                plain = [side.get(key) for side in (private, public) if isinstance(side.get(key), dict)]
                secret = next((side.get('secret') for side in plain if side.get('secret')), None)
                plaintext = plaintext or secret is not None
            if secret is None and entry.get(SEALED_FIELD):
                self._keep_unopened(key, public.get(key), entry)
                continue
            source = entry or public.get(key)
            credentials = Credentials.from_dict(dict(source, secret=secret)) if isinstance(source, dict) else None
            if credentials is not None:
                stored[key] = credentials
        kept = set(stored) | set(self.unopened)
        stale = plaintext or set(public) != kept or any(_has_legacy_fields(entry) for entry in public.values())
        return stored, stale

    def _keep_unopened(self, key, public_entry, private_entry):
        if not isinstance(public_entry, dict):
            public_entry = {name: private_entry[name] for name in PUBLIC_FIELDS if name in private_entry}
        self.unopened[key] = (public_entry, private_entry)
        if key not in self.reported:
            self.reported.add(key)
            log('binding: the sealed secret of account %s does not open now, kept for the next start' % key)

    def _all(self):
        stored, stale = self._load()
        if stale:
            self._persist(stored)
        accounts = dict(stored)
        accounts.update(self.session)
        return accounts

    def _persist(self, stored):
        if self.private is None or not self.box.available():
            return False
        public = {key: halves[0] for key, halves in self.unopened.items()}
        private = {key: halves[1] for key, halves in self.unopened.items()}
        for key, credentials in stored.items():
            sealed = self.box.seal(credentials.secret)
            if sealed is None:
                return False
            public[key] = _public_entry(credentials)
            private[key] = dict(public[key])
            private[key][SEALED_FIELD] = sealed
        try:
            self.private.write({'accounts': private})
            self.public.write({'accounts': public})
        except (IOError, OSError):
            return False
        return True

    def migrate(self):
        self._all()

    def get(self, account_id):
        if not is_int(account_id):
            return None
        return self._all().get(str(account_id))

    def save(self, credentials):
        key = str(credentials.account_id)
        stored, _ = self._load()
        stored[key] = credentials
        self.unopened.pop(key, None)
        if self._persist(stored):
            self.session.pop(key, None)
        else:
            self.session[key] = credentials

    def remove(self, account_id):
        key = str(account_id)
        in_session = self.session.pop(key, None) is not None
        stored, _ = self._load()
        was_unopened = self.unopened.pop(key, None) is not None
        if stored.pop(key, None) is None and not was_unopened:
            return in_session
        if not self._persist(stored):
            self._forget(key)
        return True

    def _forget(self, key):
        for storage in (self.public, self.private):
            data = storage.read({}) if storage is not None else {}
            if isinstance(data, dict) and isinstance(data.get('accounts'), dict) and data['accounts'].pop(key, None):
                storage.write(data)
