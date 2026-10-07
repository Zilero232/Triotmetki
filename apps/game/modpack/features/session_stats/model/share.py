from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.me import OK_STATUS, device_body
from .constants import (
    BOTH_CHANNELS,
    CHANNELS,
    SHARE_REFUSED,
    SHARE_REFUSED_STATUSES,
    SHARE_RETRY,
    SHARE_SEND_FAILED,
    SHARE_SEND_FAILURES,
    SHARE_SYNCED,
)


def channels_of(choice):
    if choice == BOTH_CHANNELS:
        return list(CHANNELS)
    if choice in CHANNELS:
        return [choice]
    return [CHANNELS[0]]


def preference_body(credentials, enabled, choice):
    body = device_body(credentials)
    body.update({'enabled': bool(enabled), 'channels': channels_of(choice)})
    return body


def send_body(credentials, session_id, choice):
    body = device_body(credentials)
    body.update({'session_id': session_id, 'channels': channels_of(choice)})
    return body


def preference_of(config):
    return bool(config.get('share_session_report')), config.get('share_session_channel')


def send_failure_key(status):
    return SHARE_SEND_FAILURES.get(status, SHARE_SEND_FAILED)


def preference_outcome(status):
    if status == OK_STATUS:
        return SHARE_SYNCED
    if status in SHARE_REFUSED_STATUSES:
        return SHARE_REFUSED
    return SHARE_RETRY


def restore_synced(stored):
    if not isinstance(stored, list) or len(stored) != 2:
        return None
    return tuple(stored)
