from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.native import apply_settings, read_settings
from ....core.codec import decode_json
from ....core.log import log, log_exception, safe
from ...version import MOD_ID, VERSION
from .. import (
    POLL_PATH,
    SETTINGS_PATH,
    SettingsShareError,
    build_export_request,
    build_poll_request,
    build_result_request,
    changes_to_values,
    clean_values,
    parse_poll_response,
    plan_apply,
    raw_key_of,
    result_path,
    signed_post,
)
from .constants import CORE_NAMES, POLL_EVERY_S


def read_client_settings():
    current = read_settings(CORE_NAMES.values())
    if current is None:
        return None
    values = dict((key, current[name]) for key, name in CORE_NAMES.items() if name in current)
    return clean_values(values)


def write_client_settings(values):
    writable = dict((key, value) for key, value in clean_values(values).items() if key in CORE_NAMES)
    return apply_settings(dict((CORE_NAMES[key], value) for key, value in writable.items()))


def show_confirm(title, message, callback):
    try:
        from gui import DialogsInterface
        from gui.Scaleform.daapi.view.dialogs import I18nConfirmDialogButtons, SimpleDialogMeta
        meta = SimpleDialogMeta(title=title, message=message, buttons=I18nConfirmDialogButtons())
        DialogsInterface.showDialog(meta, callback)
        return True
    except Exception:
        log_exception('settings confirm dialog')
        return False


class SettingsShare(object):

    def __init__(self, app):
        self.app = app
        self.last_poll = 0.0
        self.polling = False
        self.asked = set()

    def _in_hangar(self):
        return not self.app.in_battle and self.app.account_id is not None

    def _enabled(self):
        app = self.app
        return app.config.is_enabled('share_settings') and app.is_bound() and not app.auth_failed

    def _post(self, path, payload, callback):
        app = self.app
        url = app.config.endpoint(path)
        user_agent = '%s/%s' % (MOD_ID, VERSION)
        signed_post(app.transport, url, app.current_credentials(), payload, user_agent, callback)

    @safe
    def on_hangar(self):
        action = self.app.config.get('settings_action')
        if not action or not self._in_hangar():
            return
        self.app.config.update({'settings_action': ''})
        self.app.save_config()
        if action == 'export':
            self.export()

    def export(self):
        if not self._in_hangar() or not self._enabled():
            return
        values = read_client_settings()
        if values is None:
            self.app.ui.notify(self.app.translate('settings_unavailable'))
            return
        config = self.app.config
        try:
            payload = build_export_request(
                self.app.current_credentials(),
                VERSION,
                config.get('settings_target'),
                config.get('settings_anonymous_stats'),
                values,
            )
        except SettingsShareError as error:
            self.app.ui.notify(self.app.translate('settings_export_failed', reason=error.reason))
            return

        @safe
        def done(status, body, headers):
            if 200 <= status < 300:
                self.app.ui.notify(self.app.translate('settings_exported'))
            else:
                self.app.ui.notify(self.app.translate('settings_export_failed', reason='http_%d' % status))

        self._post(SETTINGS_PATH, payload, done)

    def _should_poll(self, now):
        if self.polling or now - self.last_poll < POLL_EVERY_S:
            return False
        return self._in_hangar() and self._enabled()

    @safe
    def tick(self, now):
        if not self._should_poll(now):
            return
        self.last_poll = now
        self.polling = True
        account_id = self.app.account_id

        @safe
        def done(status, body, headers):
            self.polling = False
            if status != 200 or account_id != self.app.account_id:
                return
            try:
                data = decode_json(body)
            except (ValueError, UnicodeDecodeError):
                return
            self._ask_first_new(parse_poll_response(data))

        try:
            self._post(POLL_PATH, build_poll_request(self.app.current_credentials()), done)
        except Exception:
            self.polling = False
            raise

    def _ask_first_new(self, requests):
        for request in requests:
            if request['id'] not in self.asked:
                self._ask(request)
                return

    def _ask(self, request):
        self.asked.add(request['id'])
        current = read_client_settings()
        if current is None:
            self.asked.discard(request['id'])
            log('settings core unavailable, apply request %s stays pending' % request['id'])
            return

        config = self.app.config
        changes = plan_apply(
            current,
            request,
            config.get('settings_include_resolution'),
            config.get('settings_include_sensitivity'),
        )
        writable = [change for change in changes if raw_key_of(change[0], change[1]) in CORE_NAMES]
        if not writable:
            self._report_nothing_writable(request, changes)
            return
        self._confirm(request, writable)

    def _report_nothing_writable(self, request, changes):
        if changes:
            log('apply request %s has no settings this client can write' % request['id'])
        self._report(request['id'], 'rejected' if changes else 'applied')

    def _confirm(self, request, changes):
        translate = self.app.translate
        groups = ', '.join(sorted(set(change[0] for change in changes)))
        title = translate('settings_apply_title', slug=request['profile_slug'])
        message = translate('settings_apply_body', count=len(changes), groups=groups)

        @safe
        def answered(confirmed):
            if not self._in_hangar():
                self.asked.discard(request['id'])
                return
            if confirmed:
                self._apply(request, changes)
            else:
                self._report(request['id'], 'rejected')

        if not show_confirm(title, message, answered):
            self.asked.discard(request['id'])
            log('confirm dialog unavailable, apply request %s stays pending' % request['id'])

    def _apply(self, request, changes):
        if write_client_settings(changes_to_values(changes)):
            self._report(request['id'], 'applied')
            self.app.ui.notify(self.app.translate('settings_applied'))
        else:
            self.app.ui.notify(self.app.translate('settings_unavailable'))

    def _report(self, request_id, status):
        try:
            path = result_path(request_id)
            payload = build_result_request(self.app.current_credentials(), status)
        except SettingsShareError as error:
            log('settings result not sent: %s' % error.reason)
            return
        self._post(path, payload, lambda *args: None)
