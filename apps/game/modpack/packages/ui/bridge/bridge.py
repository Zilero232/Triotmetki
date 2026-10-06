from __future__ import absolute_import, division, print_function, unicode_literals

from ...companion.config import record_user_set
from ...core.compat import is_number, string_types, to_text
from ...core.hud import EVENT_RESET_LAYOUT
from ...core.log import log, log_exception
from ..components import COMPANION_ACTIONS, COMPANION_ID, SECTIONS, build_catalog, find
from ..feeds import Feed
from ..fields import Labels
from ..hud_edit import HudEditor, move_values
from ..profiles import (
    ProfileError,
    apply_snapshot,
    decode_profile,
    encode_profile,
    imported_snapshot,
    shared_snapshot,
    take_snapshot,
)
from ..protocol import MAX_DIAG_CHARS, QUIET_COMMANDS, ProtocolError, decode_message, encode_feed
from ..window_layout import WindowLayout
from .companion import CompanionActions
from .constants import (
    CONFIG_COMPONENT,
    CONFIG_KIND,
    EVENT_COMPONENT_SETTINGS,
    LANGUAGE_CHOICES,
    LANGUAGES,
    NOTICE_CODE,
    NOTICE_ERROR,
    NOTICE_INFO,
    TOOL_PAGES,
)
from .links import site_link, site_url


class SettingsBridge(object):

    def __init__(self, context):
        self.context = context
        self.editor = HudEditor(context.bus, context.layer)
        self.companion = CompanionActions(context.config, self.labels)
        self.notice = None
        self.revision = 0
        self.feeds = {}
        self.watched = None
        self.scroll = {}

    def labels(self):
        return Labels(self.context.catalog, self.context.language())

    def components(self):
        return build_catalog(self.context, companion_instance=self.companion)

    def _instance_of(self, component_id):
        component = find(self.components(), component_id)
        return component.instance if component is not None else None

    def state(self):
        context = self.context
        labels = self.labels()
        profiles = context.profiles
        return {
            'revision': self.revision,
            'language': context.language(),
            'language_setting': context.config.get('language'),
            'languages': list(LANGUAGES),
            'status': context.status(),
            'site': site_url(context.config.server_url),
            'components': [component.describe(labels) for component in self.components()],
            'profiles': {'active': profiles.active, 'items': profiles.items()},
            'hud': {'editing': self.editor.editing, 'panels': self.editor.panels(labels)},
            'notice': self.notice,
            'window': self.window_layout().describe(),
            'scroll': dict(self.scroll),
        }

    def window_layout(self):
        return WindowLayout(self.context.component_config)

    def handle(self, raw):
        self.notice = None
        is_quiet = False
        try:
            message = decode_message(raw)
            handler = getattr(self, '_on_' + message['type'])
            handler(message)
            is_quiet = message['type'] in QUIET_COMMANDS
        except ProtocolError as error:
            self._notice(NOTICE_ERROR, 'error_protocol', reason=error.reason)
        except ProfileError as error:
            self._notice(NOTICE_ERROR, 'error_profile_%s' % error.reason)
        except Exception:
            log_exception('ui message')
            self._notice(NOTICE_ERROR, 'error_internal')
        if is_quiet:
            return False
        self.revision += 1
        return True

    def feed_text(self, now, force=False):
        if self.watched is None:
            return None
        component_id, instance = self.watched
        feed = self.feeds[component_id]
        if not feed.due(now, force):
            return None

        # A forced read follows the player's own message; only the tick's reads of a synced feed are polls.
        is_poll = not force and feed.synced
        message = feed.message(instance.ui_feed(poll=is_poll), now)
        return encode_feed(message) if message is not None else None

    def stop_feed(self):
        if self.watched is not None:
            self.feeds[self.watched[0]].reset()
        self.watched = None

    def _notice(self, kind, key, code=None, **params):
        self.notice = {'kind': kind, 'text': self.labels().text(key, **params), 'code': code}

    def _changed(self, component_id, changed):
        if changed:
            self.context.bus.emit(EVENT_COMPONENT_SETTINGS, component_id, list(changed))

    def _chosen(self, tokens):
        if tokens and record_user_set(self.context.config, tokens):
            self.context.save_config()

    def _on_ready(self, message):
        log('ui: settings page ready')

    def _on_close(self, message):
        self.editor.set_editing(False)
        self.context.close()

    def _on_set(self, message):
        component = find(self.components(), message['component'])
        key = message['key']
        if component is None or not _is_editable(component, key):
            raise ProtocolError('unknown_setting')

        changed, kind = component.update(key, message['value'])
        if not changed:
            self._notice(NOTICE_ERROR, 'error_value')
            return
        self._chosen(_chosen_tokens(component.id, changed, kind))
        self._changed(component.id, changed)
        if kind == CONFIG_KIND:
            self.context.config_changed(changed)

    def _on_set_many(self, message):
        component = find(self.components(), message['component'])
        values = message['values']
        if component is None or not isinstance(values, dict) or not values:
            raise ProtocolError('unknown_setting')
        if not all(_is_editable(component, key) for key in values):
            raise ProtocolError('unknown_setting')

        changed, config_changed, tokens = [], [], []
        for key in sorted(values):
            keys, kind = component.update(key, values[key])
            changed.extend(keys)
            tokens.extend(_chosen_tokens(component.id, keys, kind))
            if kind == CONFIG_KIND:
                config_changed.extend(keys)
        self._chosen(tokens)
        self._changed(component.id, sorted(set(changed)))
        if config_changed:
            self.context.config_changed(sorted(set(config_changed)))

    def _on_action(self, message):
        component_id = message['component']
        action = message['action']
        if component_id == COMPANION_ID and action in COMPANION_ACTIONS:
            self.context.companion_action(action)
            return
        instance = self._instance_of(component_id)
        if instance is None or not hasattr(instance, 'ui_action'):
            raise ProtocolError('unknown_action')

        notice = instance.ui_action(action, message.get('row'), message.get('value'))
        if isinstance(notice, dict):
            self.notice = {'kind': notice.get('kind', NOTICE_INFO), 'text': notice.get('text'), 'code': None}

    def _on_language(self, message):
        language = message['language']
        if language not in LANGUAGE_CHOICES:
            raise ProtocolError('unknown_language')
        self.context.set_language(language)

    def _on_bind(self, message):
        code = message['code']
        if not isinstance(code, string_types) or not code.strip():
            raise ProtocolError('empty_code')
        self.context.bind(to_text(code).strip())

    def _on_open(self, message):
        url = site_link(self.context.config.server_url, message['path'])
        if url is None:
            raise ProtocolError('unsafe_link')
        self.context.open_url(url)

    def _on_profile_save(self, message):
        snapshot = take_snapshot(self.context.config, self.context.component_config)
        item = self.context.profiles.save(message['name'], snapshot, message.get('id'))
        self._notice(NOTICE_INFO, 'notice_profile_saved', name=item['name'])

    def _on_profile_load(self, message):
        context = self.context
        item = context.profiles.get(message['id'])
        if item is None:
            raise ProfileError('missing')
        changes = apply_snapshot(
            item['data'],
            context.config,
            context.save_config,
            context.component_config,
            context.layer,
        )

        for component_id, changed in sorted(changes.items()):
            self._changed(component_id, changed)
        config_changed = changes.get(CONFIG_COMPONENT) or []
        if config_changed:
            context.config_changed(config_changed)
        if 'language' in config_changed:
            context.set_language(context.config.get('language'))
        context.flush_saves()
        context.profiles.activate(item['id'])
        self._notice(NOTICE_INFO, 'notice_profile_loaded', name=item['name'])

    def _on_profile_rename(self, message):
        self.context.profiles.rename(message['id'], message['name'])

    def _on_profile_delete(self, message):
        self.context.profiles.delete(message['id'])

    def _on_profile_export(self, message):
        item = self.context.profiles.get(message['id'])
        if item is None:
            raise ProfileError('missing')
        code = encode_profile(item['name'], shared_snapshot(item['data']))
        self._notice(NOTICE_CODE, 'notice_profile_code', code=code)

    def _on_profile_import(self, message):
        name, decoded = decode_profile(message['code'])
        snapshot = imported_snapshot(decoded, self.context.config, self.context.component_config)
        wanted = message.get('name') or name or self.labels().text('profile_imported_name')
        item = self.context.profiles.save(wanted, snapshot)
        self._notice(NOTICE_INFO, 'notice_profile_imported', name=item['name'])

    def _on_hud_edit(self, message):
        if self.editor.set_editing(message['active']):
            self.context.hud_editing(self.editor.editing)

    def _on_hud_move(self, message):
        panel_id = message['panel']
        self._changed(panel_id, self.editor.move(panel_id, move_values(message)))

    def _on_hud_reset(self, message):
        panel_id = message['panel']
        self._changed(panel_id, self.editor.reset(panel_id))

    def _on_feed(self, message):
        component_id = message['component']
        if not message['active']:
            self._unwatch(component_id)
            return
        instance = self._instance_of(component_id)
        if instance is None or not hasattr(instance, 'ui_feed'):
            raise ProtocolError('unknown_feed')

        self.stop_feed()
        self.feeds.setdefault(component_id, Feed(component_id)).reset()
        self.watched = (component_id, instance)

    def _unwatch(self, component_id):
        if self.watched is not None and self.watched[0] == component_id:
            self.stop_feed()

    def _on_diag(self, message):
        text = message['text']
        if isinstance(text, string_types):
            log('ui: page %s' % to_text(text)[:MAX_DIAG_CHARS])

    def _on_escape(self, message):
        self.context.escape_answered()

    def _on_scroll(self, message):
        page = message['page']
        top = message['top']
        if page not in SECTIONS + TOOL_PAGES:
            raise ProtocolError('unknown_page')
        if not is_number(top):
            raise ProtocolError('bad_scroll')
        self.scroll[page] = max(int(top), 0)

    def _on_window_layout(self, message):
        self.window_layout().update(message)

    def _on_hud_reset_all(self, message):
        for panel_id in self.editor.panel_ids():
            self._changed(panel_id, self.editor.reset(panel_id))
        self.context.bus.emit(EVENT_RESET_LAYOUT)


def _chosen_tokens(component_id, keys, kind):
    if kind == CONFIG_KIND:
        return list(keys)
    return ['%s.%s' % (component_id, key) for key in keys]


def _is_editable(component, key):
    return isinstance(key, string_types) and component.editable(key)
