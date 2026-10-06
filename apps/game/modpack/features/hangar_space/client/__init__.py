from __future__ import absolute_import, division, print_function, unicode_literals

import os

import BigWorld

from ....core.client.component import FeatureComponent
from ....core.client.hud import component_config
from ....core.client.timer import Ticker, game_time
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    ACTION_CHOOSE,
    ACTION_LOOK,
    ACTION_NATIVE,
    ACTION_REFRESH_PREVIEW,
    CHECK_CAPTURE,
    CHECK_WAIT,
    PLAN_LATER,
    PLAN_LOADED,
    PLAN_RELOAD,
    PLAN_WAIT,
    PREVIEW_FOLDER,
    CaptureBook,
    GalleryPictures,
    available_looks,
    build_page,
    chosen_target,
    environment_changes,
    find_look,
    listed_spaces,
    look_preview,
    override_changes,
    preview_key,
    reload_plan,
    row_look,
    same_path,
    space_name,
    space_names,
    space_preview,
    taken_slots,
    wanted_environments,
)
from ..settings import ADVANCED, SCHEMA, SWITCH
from .capture import PreviewStore, SceneShot, clean_hangar_on_screen
from .constants import PREVIEW_CHECK_S
from .environment import (
    active_environment,
    environment_names,
    environment_slots,
    slot_targets,
    switch_environment,
    write_environments,
)
from .space import (
    available_paths,
    controller,
    current_name,
    default_path,
    hangar_space,
    is_default_scene,
    once_space_created,
    overrides,
    space_ready,
    target_path,
    write_overrides,
)

ACTIONS = (ACTION_CHOOSE, ACTION_LOOK, ACTION_NATIVE, ACTION_REFRESH_PREVIEW)


# The hangar space the player picked stands in for the game's default one: written into the client's default hangar
# config the way its server event notifications write theirs, so an event hangar and the hangars of other modes still
# win, and taken out again when the switch goes off or the choice goes back to the game's own. The default hangar
# reloads at once when it is the one open; a space still loading is waited for the way the switch controller waits.
# A look adds a stock environment of its space: written into the same config's environment slot (used when the space
# loads) and switched live when its space is the one loaded. A pick (or the refresh button) arms one preview shot of the
# hangar it leads to, taken once the player is back in the plain hangar (README, hangar_space previews).
class HangarSpace(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.owned = None
        self.owned_environment = u''
        self.kept_spaces = {}
        self.kept_environments = {}
        self.waiting = False
        self.environment_pending = False
        self.missing_looks = set()
        self.previews = PreviewStore(os.path.join(app.config_dir, PREVIEW_FOLDER))
        self.capture_book = CaptureBook()
        self.shot = SceneShot(self.previews, self._preview_done)
        self.preview_ticker = Ticker(PREVIEW_CHECK_S, self._check_preview)
        app.bus.on('hangar', self.apply)

    def settings_changed(self, changed):
        self.apply(force=True)

    def looks(self, names):
        spaces = listed_spaces(names)
        return available_looks(spaces, environment_names(spaces))

    def chosen_look(self, names):
        look_id = self.settings.get('look')
        look = find_look(self.looks(names), look_id)
        if look_id and look is None and look_id not in self.missing_looks:
            self.missing_looks.add(look_id)
            log('hangar space: look %s is not in this client, the game\'s own look stays' % look_id)
        return look

    def wanted(self):
        if not self.enabled():
            return None, u''
        names = space_names(available_paths())
        return chosen_target(self.settings.get('space'), self.chosen_look(names), names)

    def apply(self, force=False):
        switcher = controller()
        if switcher is None or self.app.in_battle:
            if force:
                log('hangar space: no hangar switch controller here (battle or not in the lobby), later')
            return PLAN_LATER
        path, environment = self.wanted()
        space_changes = self._write_space(switcher, path)
        hangar = hangar_space()
        environment_changed = self._write_environment(switcher, hangar, path, environment)
        if path is None:
            self.kept_spaces, self.kept_environments = {}, {}
        ready = space_ready(hangar) and bool(available_paths())
        target = target_path(switcher, hangar) if ready else None
        loaded = getattr(hangar, 'spacePath', None)
        plan = reload_plan(is_default_scene(switcher), ready, target, loaded)
        if space_changes or force:
            self._follow(switcher, hangar, plan)
        live = environment if same_path(loaded, path) else self._slot_environment(switcher, hangar)
        self._follow_environment(plan, loaded, live, environment_changed)
        if space_changes or environment_changed or force:
            log('hangar space: wanted %s / %s; slots %s; loaded %s, target %s: %s' % (
                path or 'the game default', environment or 'its own look', self._slots_text(switcher), loaded,
                target, plan))
        return plan

    def _write_space(self, switcher, path):
        current = overrides(switcher)
        default = default_path()
        taken = taken_slots(current, self.owned, path, default)
        for is_premium, value in taken.items():
            self.kept_spaces.setdefault(is_premium, value)
        changes = override_changes(current, self.owned, path, default, self.kept_spaces)
        self.owned = path
        if changes:
            write_overrides(switcher, changes)
        return changes

    def _slots_text(self, switcher):
        current = overrides(switcher)
        environments = environment_slots(switcher) or {}
        return ', '.join('%s %s/%s' % ('premium' if is_premium else 'basic', current.get(is_premium),
                                        environments.get(is_premium) or '-') for is_premium in (True, False))

    @staticmethod
    def _slot_environment(switcher, hangar):
        slots = environment_slots(switcher) or {}
        return slots.get(bool(getattr(hangar, 'isPremium', False))) or u''

    def is_held(self, switcher, hangar):
        path = self.owned
        return bool(path) and not same_path(target_path(switcher, hangar), path)

    def _write_environment(self, switcher, hangar, path, environment):
        current = environment_slots(switcher)
        if current is None:
            return False
        taken = set(self.kept_spaces) if path else set()
        for is_premium in taken:
            self.kept_environments.setdefault(is_premium, current.get(is_premium) or u'')
        targets = slot_targets(switcher) if environment else {}
        wanted = wanted_environments(targets, path, environment)
        changes = environment_changes(current, self.owned_environment, wanted, taken, self.kept_environments)
        self.owned_environment = environment
        if not changes:
            return False
        write_environments(switcher, changes)
        return bool(getattr(hangar, 'isPremium', False)) in changes

    def _follow(self, switcher, hangar, plan):
        if plan == PLAN_RELOAD:
            switcher.processPossibleSceneChange()
        elif plan == PLAN_WAIT and not self.waiting:
            self.waiting = True
            once_space_created(hangar, self._space_created)

    # A changed environment of the loaded space is switched live; a reload or a space still loading takes it from the
    # slot, and a space that loaded before the slot was written is switched once it is ready.
    def _follow_environment(self, plan, loaded, environment, changed):
        self.environment_pending = self.environment_pending or changed
        if plan == PLAN_RELOAD:
            self.environment_pending = False
        elif plan == PLAN_LOADED and self.environment_pending:
            self.environment_pending = False
            switch_environment(environment or active_environment(loaded))

    def _space_created(self):
        self.waiting = False
        BigWorld.callback(0, safe(lambda: self.apply(force=True)))

    def on_screen_key(self):
        hangar = hangar_space()
        name = current_name()
        if hangar is None or name is None or not space_ready(hangar):
            return None
        look = self.chosen_look(space_names(available_paths())) if self.enabled() else None
        is_live = look is not None and look.space == name and self.owned_environment == look.environment
        return preview_key(name, look.id if is_live else u'')

    def arm_preview(self, forced_key=None):
        self.capture_book.arm(game_time() or 0.0, forced_key)
        self.preview_ticker.start()

    def _check_preview(self):
        if self.shot.busy:
            return True
        if not self.enabled() or self.app.in_battle:
            self.capture_book.disarm()
            return False
        key = self.on_screen_key()
        result = self.capture_book.check(game_time() or 0.0, key, self.previews.has(key), clean_hangar_on_screen())
        if result == CHECK_CAPTURE:
            self.shot.take(key)
        return result == CHECK_WAIT

    def _preview_done(self, key, saved):
        if not saved:
            log('hangar space: no preview of %s this time, the tile keeps its picture' % key)

    def ui_page(self):
        if not self.enabled_in_hangar():
            return None
        names = space_names(available_paths())
        looks = self.looks(names)
        return build_page(names, self.settings.get('space'), current_name(), self.app.translate,
                          looks=looks, look=self.settings.get('look'),
                          pictures=GalleryPictures(self.previews.data_uris(), space_name(default_path())))

    def ui_thumb(self):
        look_id = self.settings.get('look')
        look = self.chosen_look(space_names(available_paths())) if look_id else None
        space = self.settings.get('space')
        key = preview_key(look.space, look.id) if look is not None else preview_key(space) if space else None
        fallback = look_preview(look_id) if look_id else space_preview(space)
        return self.previews.data_uri(key) or fallback

    def ui_actions(self):
        if not self.enabled_in_hangar():
            return []
        return [{'id': ACTION_REFRESH_PREVIEW, 'label': self.app.translate('hangar_space_refresh_preview'),
                 'confirm': None}]

    def ui_advanced(self):
        return ADVANCED

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar() or action not in ACTIONS:
            return None
        if action == ACTION_REFRESH_PREVIEW:
            return self._refresh_preview()
        if action == ACTION_LOOK:
            return self._choose_look(row_look(row))
        chosen = row if action == ACTION_CHOOSE else u''
        if chosen and chosen not in space_names(available_paths()):
            return self.notice_error('hangar_space_refused_missing')
        return self._save({'space': chosen, 'look': u''}, 'hangar_space_applied')

    def _refresh_preview(self):
        key = self.on_screen_key()
        if key is None:
            return self.notice_info('hangar_space_preview_later')
        self.arm_preview(forced_key=key)
        return self.notice_info('hangar_space_preview_armed')

    def _choose_look(self, look_id):
        if find_look(self.looks(space_names(available_paths())), look_id) is None:
            return self.notice_error('hangar_space_refused_look')
        return self._save({'look': look_id}, 'hangar_space_look_applied')

    def _save(self, values, applied):
        component_config(self.app).update(self.component_id, values)
        self.arm_preview()
        if self.apply(force=True) == PLAN_LATER:
            return self.notice_info('hangar_space_later')
        switcher = controller()
        if switcher is not None and self.is_held(switcher, hangar_space()):
            return self.notice_info('hangar_space_held')
        return self.notice_info(applied)
