from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_version
from ....core.codec import encode_json, parse_json_body
from ....core.log import safe
from ...payload import REALM
from ...version import VERSION
from .. import BIND_PATH, REASON_NO_ACCOUNT, BindError, build_bind_request, parse_bind_response
from ..messages import failure_key


class Binder(object):

    def __init__(self, app):
        self.app = app

    def bind_from_config(self):
        app = self.app
        code = app.config.get('bind_code')
        if code:
            app.config.update({'bind_code': ''})
            app.save_config()
            self.bind(code)

    def bind(self, raw_code):
        app = self.app
        if not app.account_id:
            app.ui.notify(app.translate('bind_no_account'))
            return
        try:
            request = build_bind_request(raw_code, app.account_id, VERSION, client_version(), REALM)
        except BindError as error:
            key = 'bind_no_account' if error.reason == REASON_NO_ACCOUNT else 'bind_invalid_code'
            app.ui.notify(app.translate(key))
            return
        self._send(request, app.account_id)

    def _send(self, request, account_id):
        app = self.app
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': app.user_agent()}

        @safe
        def done(status, body, response_headers):
            self._on_response(account_id, status, parse_json_body(body))

        app.transport.request('POST', app.config.endpoint(BIND_PATH), headers, encode_json(request), done)

    def _on_response(self, account_id, status, data):
        app = self.app
        if status != 200:
            reason = data.get('error') if isinstance(data, dict) else None
            app.ui.notify(app.translate(failure_key(reason)))
            return
        try:
            credentials = parse_bind_response(data, account_id)
        except BindError as error:
            app.ui.notify(app.translate(failure_key(error.reason)))
            return

        app.credentials.save(credentials)
        if account_id == app.account_id:
            app.rebuild_sender()
        app.ui.notify(app.translate('bind_success'))
        app.settings_ui.refresh()
