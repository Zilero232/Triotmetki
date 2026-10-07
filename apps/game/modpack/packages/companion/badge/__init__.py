# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.me import OK_STATUS, device_body
from .constants import (  # noqa: F401
    COMPANION_COMPONENT,
    ENABLED_KEY,
    PREFERENCE_PATH,
    REFUSED,
    REFUSED_STATUSES,
    RETRY,
    RETRY_S,
    SHOW_KEY,
    STATE_KEY,
    SYNCED,
)


def wanted_visible(config):
    return bool(config.get(ENABLED_KEY)) and bool(config.get(SHOW_KEY))


def preference_body(credentials, visible):
    body = device_body(credentials)
    body['visible'] = bool(visible)
    return body


def preference_outcome(status):
    if status == OK_STATUS:
        return SYNCED
    if status in REFUSED_STATUSES:
        return REFUSED
    return RETRY


def restore_synced(stored):
    return stored if isinstance(stored, bool) else None


class PreferenceSync(object):

    def __init__(self):
        self.synced = None
        self.refused = None
        self.sending = False
        self.retry_at = 0.0

    def reset(self, synced=None):
        self.synced = synced
        self.refused = None
        self.sending = False
        self.retry_at = 0.0

    def changed(self):
        self.retry_at = 0.0

    def needs_sync(self, wanted, now):
        if self.sending or now < self.retry_at:
            return False
        if wanted in (self.synced, self.refused):
            return False
        return wanted or self.synced is not None

    def sent(self):
        self.sending = True

    def answered(self, wanted, status, now):
        self.sending = False
        outcome = preference_outcome(status)
        if outcome == SYNCED:
            self.synced = wanted
        elif outcome == REFUSED:
            self.refused = wanted
        else:
            self.retry_at = now + RETRY_S
        return outcome
