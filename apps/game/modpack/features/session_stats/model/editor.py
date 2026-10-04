from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec, sample
from ..settings import SECTION
from .constants import (
    EDITOR_GROUPS,
    SAMPLE_GOALS,
    SAMPLE_ID,
    SAMPLE_MOE,
    SAMPLE_OVERVIEW,
    SAMPLE_SUMMARY,
    SAMPLE_VEHICLES,
)
from .view import SessionView
from .widget import session_widget


def sample_view(settings):
    return SessionView(
        dict(SAMPLE_SUMMARY),
        goals=SAMPLE_GOALS[:settings.get('max_goals')] if settings.get('show_goals') else (),
        overview=SAMPLE_OVERVIEW if settings.get('show_account') else None,
        vehicle_names=dict(SAMPLE_VEHICLES),
        moe=SAMPLE_MOE if settings.get('show_moe') else (),
    )


def editor(settings, translate):
    card = session_widget(sample_view(settings), settings, translate)
    return editor_spec(SECTION, EDITOR_GROUPS, translate, samples=(sample(SECTION, SAMPLE_ID, card, translate),))
