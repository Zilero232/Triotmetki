# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.codec import encode_json
from ...core.compat import string_types, to_text
from ...core.net.signing import SignedRequest, signed_request
from .constants import (  # noqa: F401
    POLL_PATH,
    PROFILE_SLUG_RE,
    RESULT_PATH,
    RESULT_STATUSES,
    SETTINGS_PATH,
    TARGETS,
    UUID_RE,
)
from .errors import SettingsShareError
from .values import (  # noqa: F401
    applicable_groups,
    build_export,
    changes_to_values,
    clean_values,
    flatten_settings,
    plan_apply,
    raw_key_of,
)


def _device_fields(credentials):
    if credentials is None or not credentials.is_valid():
        raise SettingsShareError('not_bound')
    return {'device_id': credentials.device_id, 'account_id': credentials.account_id}


def build_export_request(credentials, mod_version, target, anonymous_stats, raw_settings):
    if target not in TARGETS:
        raise SettingsShareError('bad_target')
    settings = build_export(raw_settings)
    if not settings:
        raise SettingsShareError('empty')
    payload = _device_fields(credentials)
    payload.update({
        'mod_version': to_text(mod_version)[:32],
        'target': target,
        'anonymous_stats': bool(anonymous_stats),
        'settings': settings,
    })
    return payload


def build_poll_request(credentials):
    return _device_fields(credentials)


def build_result_request(credentials, status):
    if status not in RESULT_STATUSES:
        raise SettingsShareError('bad_status')
    payload = _device_fields(credentials)
    payload['status'] = status
    return payload


def result_path(request_id):
    if not _is_request_id(request_id):
        raise SettingsShareError('bad_id')
    return RESULT_PATH % request_id


def _is_request_id(value):
    return isinstance(value, string_types) and bool(UUID_RE.match(value))


def profile_slug(value):
    if not isinstance(value, string_types) or not PROFILE_SLUG_RE.match(value):
        return u''
    return to_text(value)


def _parse_request(item):
    if not isinstance(item, dict) or not _is_request_id(item.get('id')):
        return None
    groups = applicable_groups(item.get('groups'))
    if not groups:
        return None
    return {
        'id': to_text(item['id']),
        'profile_slug': profile_slug(item.get('profile_slug')),
        'groups': groups,
        'settings': build_export(flatten_settings(item.get('settings'))),
    }


def parse_poll_response(data):
    items = data.get('requests') if isinstance(data, dict) else None
    if not isinstance(items, list):
        return []
    requests = [_parse_request(item) for item in items]
    return [request for request in requests if request is not None]


def signed_post(transport, url, credentials, payload, user_agent, callback):
    request = SignedRequest(
        method='POST',
        url=url,
        device_id=credentials.device_id,
        secret=credentials.secret,
        body=encode_json(payload),
        user_agent=user_agent,
    )
    signed_request(transport, request, callback)
