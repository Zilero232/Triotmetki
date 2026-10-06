from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import call
from ....core.client.game import client_attr, service
from ....core.log import guarded
from .constants import (
    CONDITIONS_ATTR,
    CONDITIONS_MODULE,
    CONDITIONS_SEPARATOR,
    EVENTS_CACHE_ATTR,
    EVENTS_CACHE_MODULE,
    I18N_MODULE,
    KEY_DESCRIPTION,
)
from ..model.constants import STATE_IN_PROGRESS

# RU 1.45 client source: IEventsCache.getPersonalMissions().getAllQuests() -> {id: PersonalMission}
# (gui/server_events/event_items.py) with getUserName(), getUserDescription() (a #personal_missions_details key, the
# mission's flavour text), isInProgress(), isCompleted(), isMainCompleted(), isFullCompleted(). The main and 'with
# honours' conditions are the lines the missions map tooltip shows:
# gui/server_events/personal_progress/formatters.PMTooltipConditionsFormatters().format(quest, isMain)
# -> [(icon, title, isInOrGroup)].


def _state(quest):
    if call(quest, 'isFullCompleted', False):
        return 'honors'
    if call(quest, 'isCompleted', False) or call(quest, 'isMainCompleted', False):
        return 'done'
    if call(quest, 'isInProgress', False):
        return 'in_progress'
    return None


def _conditions(formatter, quest, is_main):
    lines = call(formatter, 'format', [], quest, is_main) or []
    titles = [getattr(line, 'title', None) for line in lines]
    return CONDITIONS_SEPARATOR.join(title for title in titles if title)


# A #personal_missions_details key as the missions tooltip resolves it (gui/shared/tooltips/personal_missions.py).
def _text(key):
    exists = client_attr(I18N_MODULE, 'doesTextExist')
    make = client_attr(I18N_MODULE, 'makeString')
    if not key or exists is None or make is None:
        return None
    for candidate in (key, KEY_DESCRIPTION % key):
        if exists(candidate):
            return make(candidate)
    return None


def _mission(quest_id, quest, state, formatter):
    mission = {
        'id': quest_id,
        'name': call(quest, 'getUserName', None),
        'main': None,
        'extra': None,
        'state': state,
    }
    # The conditions are built per mission from its config, so only for the missions the labels show.
    if state == STATE_IN_PROGRESS:
        main = _conditions(formatter, quest, True)
        mission['main'] = main or _text(call(quest, 'getUserDescription', None))
        mission['extra'] = _conditions(formatter, quest, False)
    return mission


def _all_quests():
    cache = service(client_attr(EVENTS_CACHE_MODULE, EVENTS_CACHE_ATTR))
    personal = call(cache, 'getPersonalMissions')
    return call(personal, 'getAllQuests', {}) or {}


@guarded('personal missions: read', fallback=[])
def _quest_items(quests):
    return list(quests.items()) if hasattr(quests, 'items') else []


def own_missions():
    quests = _all_quests()
    formatter_class = client_attr(CONDITIONS_MODULE, CONDITIONS_ATTR)
    formatter = formatter_class() if formatter_class is not None else None
    missions = []
    for quest_id, quest in _quest_items(quests):
        state = _state(quest)
        if state is not None:
            missions.append(_mission(quest_id, quest, state, formatter))
    return missions
