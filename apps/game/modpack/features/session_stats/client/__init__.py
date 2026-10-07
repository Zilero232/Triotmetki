from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.component import ACTION_REFRESH, FeatureComponent
from ....core.client.game import vehicle_short_name
from ....core.client.me import SignedRead, can_read, post_signed, signed_body, signed_read
from ....core.errors import ReasonError
from ....core.events import EVENT_BATTLE_NOTICE_LINES
from ....core.hud import HangarLabel
from ....core.log import log
from ....core.moe import rating_change, rating_to_percent
from ..i18n import STRINGS
from ..model import (
    Announced,
    SessionAggregator,
    SessionMoe,
    SessionView,
    SiteData,
    format_session_panel,
    format_session_plain,
    goal_done_notice,
    parse_goals,
    parse_overview,
    session_widget,
)
from ..model.constants import (
    ACTION_RESET,
    ACTION_SHARE,
    ACTION_SITE,
    GOALS_KEY,
    GOALS_PATH,
    GOALS_STATE_KEY,
    MOE_ROWS,
    MOE_STATE_KEY,
    OVERVIEW_KEY,
    OVERVIEW_PATH,
    SHARE_PATH,
    SHARE_REFUSED,
    SHARE_REFUSED_NOTICE,
    SHARE_RETRY_S,
    SHARE_SEND_PATH,
    SHARE_STATE_KEY,
    SHARE_SYNCED,
    SITE_PATH,
)
from ..model.share import (
    preference_body,
    preference_of,
    preference_outcome,
    restore_synced,
    send_body,
    send_failure_key,
)
from ..settings import IDLE_MINUTES, SCHEMA, SECTION, SHARE, SHARE_CHANNEL, SWITCH
from .constants import HANGAR_PANEL, LAYOUT, SENT_STATUSES, STATE_KEY


class SessionStats(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.label = HangarLabel(app, HANGAR_PANEL)

        self.session = SessionAggregator(idle_seconds=app.config.get(IDLE_MINUTES) * 60)
        self.moe = SessionMoe()
        self.site = SiteData(app.account_id)
        self.announced = Announced()
        self.share_synced = None
        self.share_sending = False
        self.share_retry_at = 0.0
        self.share_refused = None
        app.register_account_state(STATE_KEY, lambda: self.session.to_dict(), self._load_session)
        app.register_account_state(MOE_STATE_KEY, lambda: self.moe.to_dict(), self._load_moe)
        app.register_account_state(GOALS_STATE_KEY, lambda: self.announced.to_list(), self._load_announced)
        app.register_account_state(SHARE_STATE_KEY, self._stored_share, self._load_share)

        bus = app.bus
        bus.on('account', self._on_account)
        bus.on('hangar', self._on_hangar)
        bus.on('battle_enter', self._on_battle_enter)
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_results', self._on_battle_results)
        bus.on('battle_event', self._on_battle_event)
        bus.on('battle_recorded', self._on_battle_recorded)
        bus.on('ingest_response', self._on_ingest_response)
        bus.on('rebind', self._on_rebind)
        bus.on('tick', self._on_tick)
        bus.on(EVENT_BATTLE_NOTICE_LINES, self._answer_notice_line)

    def _load_session(self, stored):
        self.session = SessionAggregator(idle_seconds=self.session.idle_seconds)
        self.session.load(stored)

    def _load_moe(self, stored):
        self.moe = SessionMoe(stored)

    def _load_announced(self, stored):
        self.announced = Announced(stored)

    def _load_share(self, stored):
        self.share_synced = restore_synced(stored)

    def _stored_share(self):
        if not self.share_synced:
            return None
        return list(self.share_synced)

    def _on_account(self, account_id):
        self.site.reset(account_id)
        self.show(False)

    def _on_hangar(self):
        now = time.time()
        self.read_site(now)
        self.show(False)
        self.sync_share(now)

    def _on_battle_enter(self):
        self.label.hide()

    # RU 1.45 client source: Avatar.py builds ClientArena from the avatar's own arenaUniqueID and arenaBonusType.
    def _on_battle_ready(self, player):
        arena_id = getattr(player, 'arenaUniqueID', None)
        bonus_type = getattr(player, 'arenaBonusType', None)

        self.session.started(arena_id, bonus_type, time.time())

    def _on_battle_results(self, arena_id, results):
        self.session.results_arrived(arena_id)

    def _on_battle_event(self, event, now):
        event['session_id'] = self.session.add(event, now)
        self.site.after_battle(now)
        if event['session_id'] is not None and self.session.counts(event):
            self._record_moe(event)

    def _record_moe(self, event):
        tank_id = (event.get('vehicle') or {}).get('tank_id')
        before = self.app.marks.before_battle(event.get('arena_unique_id'), tank_id) or {}
        after = (event.get('moe') or {}).get('damage_rating')
        change = rating_change(before.get('damage_rating'), after)
        self.moe.add(self.session.session_id, tank_id, change, rating_to_percent(after))

    def _on_battle_recorded(self):
        self.show(True)

    def _on_ingest_response(self, data):
        self.site.expedite(OVERVIEW_KEY)
        summary = data.get('session')
        if not isinstance(summary, dict):
            return
        if not self.session.set_server_summary(summary.get('session_id'), summary):
            return

        self.app.save_state()
        self.show(False)

    def _on_rebind(self):
        self.share_synced = None
        self.share_refused = None
        self._on_account(self.app.account_id)

    def _on_tick(self, now):
        self.read_site(now)
        if now >= self.share_retry_at:
            self.sync_share(now)

    def settings_changed(self, changed):
        if IDLE_MINUTES in changed:
            self.session.idle_seconds = self.app.config.get(IDLE_MINUTES) * 60
        if SHARE in changed or SHARE_CHANNEL in changed:
            self.share_retry_at = 0.0
            self.sync_share(time.time())

        self.read_site(time.time())
        self.show(False)

    def read_site(self, now):
        if not self.enabled() or not can_read(self.app):
            return

        settings = self.settings
        if settings.get('show_goals') and self.site.wants(GOALS_KEY, now):
            self._read(GOALS_KEY, GOALS_PATH, self._on_goals)
        if settings.get('show_account') and self.site.wants(OVERVIEW_KEY, now):
            self._read(OVERVIEW_KEY, OVERVIEW_PATH, self._on_overview)

    def _read(self, key, path, on_data):
        app = self.app
        read = SignedRead(
            reads=self.site,
            key=key,
            path=path,
            build=lambda: signed_body(app),
            account_of=lambda: self.site.account_id,
        )
        signed_read(app, read, on_data)

    def _on_goals(self, data, account_id):
        self.site.goals = parse_goals(data, account_id)
        self._announce(self.announced.newly_done(self.site.goals))
        self.show(False)

    def _on_overview(self, data, account_id):
        self.site.store_overview(parse_overview(data, account_id))
        self.show(False)

    def _announce(self, goals):
        if not goals:
            return

        app = self.app
        app.save_state()
        for goal in goals:
            app.ui.notify(goal_done_notice(goal, app.translate, vehicle_short_name(goal.get('tank_id'))))

    def _answer_notice_line(self, arena_id, reply):
        if not self.enabled() or not self.settings.get('notice_line'):
            return
        summary = self.current_summary()
        if summary.get('battles'):
            reply(format_session_plain(summary, self.app.translate))

    def view(self):
        settings = self.settings
        is_bound = self.app.is_bound()
        goals = self.site.goals[:settings.get('max_goals')] if is_bound and settings.get('show_goals') else []
        overview = self.site.overview if is_bound and settings.get('show_account') else None
        summary = self.current_summary()
        moe = self.moe.rows(summary.get('session_id'), MOE_ROWS) if settings.get('show_moe') else []
        tank_ids = [goal['tank_id'] for goal in goals if goal.get('tank_id')] + [entry['tank_id'] for entry in moe]
        names = {tank_id: vehicle_short_name(tank_id) for tank_id in tank_ids}

        return SessionView(summary, goals, overview, names, moe)

    def show(self, after_battle):
        app = self.app
        if app.in_battle:
            return
        if not self.enabled():
            self.label.clear()
            return

        view = self.view()
        translate = app.translate
        if app.ui.has_panels:
            text = format_session_panel(view, self.settings, translate)
            self.label.show(text, LAYOUT, widget=session_widget(view, self.settings, translate))
        elif after_battle and view.summary.get('battles'):
            app.ui.notify(format_session_plain(view.summary, translate))

    def current_summary(self):
        now = time.time()
        if self.session.is_expired(now):
            return {}
        return self.session.summary(now)

    def reset(self):
        self.session.reset(time.time())
        self.app.save_state()
        self.show(False)

        return self.notice_info('session_reset_done')

    def sync_share(self, now):
        wanted = preference_of(self.app.config)
        if not self._needs_sync(wanted):
            return

        is_enabled, channel = wanted
        try:
            payload = preference_body(self.app.current_credentials(), is_enabled, channel)
        except ReasonError as error:
            log('session share not synced: %s' % error.reason)
            return

        self.share_sending = True

        def done(status, data, retry_after):
            self._on_share_answer(wanted, status)

        post_signed(self.app, SHARE_PATH, payload, done)

    def _needs_sync(self, wanted):
        if self.share_sending:
            return False
        if wanted in (self.share_synced, self.share_refused):
            return False
        if not can_read(self.app):
            return False

        is_enabled = wanted[0]
        return is_enabled or self.share_synced is not None

    def _on_share_answer(self, wanted, status):
        self.share_sending = False

        outcome = preference_outcome(status)
        if outcome == SHARE_SYNCED:
            self.share_synced = wanted
            self.app.save_state()
        elif outcome == SHARE_REFUSED:
            self.share_refused = wanted
            self.app.ui.notify(self.app.translate(SHARE_REFUSED_NOTICE))
        else:
            self.share_retry_at = time.time() + SHARE_RETRY_S

    def ui_actions(self):
        translate = self.app.translate
        actions = [{
            'id': ACTION_RESET,
            'label': translate('session_reset'),
            'confirm': translate('session_reset_confirm'),
        }]
        if self.app.config.get(SHARE):
            actions.append({
                'id': ACTION_SHARE,
                'label': translate('session_share_now'),
                'confirm': translate('session_share_confirm'),
            })

        actions.append({'id': ACTION_REFRESH, 'label': translate('session_refresh'), 'confirm': None})
        actions.append({'id': ACTION_SITE, 'label': translate('session_site'), 'link': SITE_PATH, 'confirm': None})
        return actions

    def ui_action(self, action, row=None, value=None):
        if action == ACTION_RESET:
            return self.reset()
        if action == ACTION_SHARE:
            return self._share_now()
        return self.refresh_action(action, 'session_unbound', 'session_refreshing', self._refresh)

    def _refresh(self):
        self.site.refresh_all()
        self.read_site(time.time())

    def _share_refusal(self):
        if not self.app.config.get(SHARE):
            return 'session_share_off'
        if not self.app.is_bound():
            return 'session_share_unbound'
        if not self.current_summary().get('battles'):
            return 'session_share_empty'
        return None

    def _share_now(self):
        app = self.app
        refusal = self._share_refusal()
        if refusal:
            return self.notice_error(refusal)

        payload = send_body(app.current_credentials(), self.session.session_id, app.config.get(SHARE_CHANNEL))

        def done(status, data, retry_after):
            if status not in SENT_STATUSES:
                app.ui.notify(app.translate(send_failure_key(status), status=status))

        post_signed(app, SHARE_SEND_PATH, payload, done)
        return self.notice_info('session_share_sent')
