from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....core.client.component import FeatureComponent
from ....core.client.hud import component_config
from ....core.log import log, safe
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    ACTION_CHOOSE,
    ACTION_NATIVE,
    PLAN_LATER,
    PLAN_RELOAD,
    PLAN_WAIT,
    available_space,
    build_page,
    override_changes,
    reload_plan,
    space_names,
    space_path,
    space_preview,
)
from ..settings import ADVANCED, SCHEMA, SWITCH
from .space import (
    available_paths,
    controller,
    current_name,
    hangar_space,
    is_default_scene,
    once_space_created,
    overrides,
    space_ready,
    target_path,
    write_overrides,
)


# The hangar space the player picked stands in for the game's default one: written into the client's default hangar
# config the way its server event notifications write theirs, so an event hangar and the hangars of other modes still
# win, and taken out again when the switch goes off or the choice goes back to the game's own. The default hangar
# reloads at once when it is the one open; a space still loading is waited for the way the switch controller waits.
class HangarSpace(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.owned = None
        self.waiting = False
        app.bus.on('hangar', self.apply)

    def settings_changed(self, changed):
        self.apply(force=True)

    def wanted_path(self):
        if not self.enabled():
            return None
        return space_path(available_space(self.settings.get('space'), space_names(available_paths())))

    def apply(self, force=False):
        switcher = controller()
        if switcher is None or self.app.in_battle:
            return PLAN_LATER
        wanted = self.wanted_path()
        changes = override_changes(overrides(switcher), self.owned, wanted)
        self.owned = wanted
        if changes:
            write_overrides(switcher, changes)
            log('hangar space: %s' % (wanted or 'the game default'))
        hangar = hangar_space()
        ready = space_ready(hangar) and bool(available_paths())
        target = target_path(switcher, hangar) if ready else None
        plan = reload_plan(is_default_scene(switcher), ready, target, getattr(hangar, 'spacePath', None))
        if changes or force:
            self._follow(switcher, hangar, plan)
        return plan

    def _follow(self, switcher, hangar, plan):
        if plan == PLAN_RELOAD:
            switcher.processPossibleSceneChange()
        elif plan == PLAN_WAIT and not self.waiting:
            self.waiting = True
            once_space_created(hangar, self._space_created)

    def _space_created(self):
        self.waiting = False
        BigWorld.callback(0, safe(lambda: self.apply(force=True)))

    def ui_page(self):
        if not self.enabled_in_hangar():
            return None
        names = space_names(available_paths())
        return build_page(names, self.settings.get('space'), current_name(), self.app.translate)

    def ui_thumb(self):
        return space_preview(self.settings.get('space'))

    def ui_advanced(self):
        return ADVANCED

    def ui_action(self, action, row=None, value=None):
        if not self.enabled_in_hangar() or action not in (ACTION_CHOOSE, ACTION_NATIVE):
            return None
        chosen = row if action == ACTION_CHOOSE else u''
        if chosen and chosen not in space_names(available_paths()):
            return self.notice_error('hangar_space_refused_missing')
        component_config(self.app).update(self.component_id, {'space': chosen})
        if self.apply(force=True) == PLAN_LATER:
            return self.notice_info('hangar_space_later')
        return self.notice_info('hangar_space_applied')
