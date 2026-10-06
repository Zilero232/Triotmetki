from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.moe import ThresholdCurve
from ....core.settings import Settings
from ..settings import CARD_SCHEMA
from . import format_panel, hangar_state, panel_state
from .card import TankCard, tank_card
from .card_text import card_text
from .constants import (
    CARD_PREVIEW_MASTERY,
    CARD_PREVIEW_OWN_MASTERY,
    CARD_PREVIEW_RESEARCH,
    CARD_PREVIEW_SUMMARY,
    CARD_PREVIEW_TANK,
    CARD_PREVIEW_TIER,
    CARD_PREVIEW_VEHICLE,
    PREVIEW_COMBINED,
    PREVIEW_PACE,
    PREVIEW_SNAPSHOT,
    PREVIEW_THRESHOLDS,
    PREVIEW_CLASS,
)
from .research import research_state
from .widget import marks_widget


def _curve():
    return ThresholdCurve.from_api(PREVIEW_THRESHOLDS)


def preview_state(settings):
    return panel_state(PREVIEW_SNAPSHOT, PREVIEW_COMBINED, _curve(), PREVIEW_PACE, settings)


# The HUD editor shows the panel as it is in battle: its box is the one the player places.
def preview_text(settings, translate):
    return format_panel(preview_state(settings), settings, translate)


def preview_widget(settings, translate):
    return marks_widget(preview_state(settings), settings, translate)


# The card as the style draws it at rest: the window's editor shows what the style changes, and the compact card its
# Alt hint.
def card_preview():
    state = hangar_state(PREVIEW_SNAPSHOT, _curve(), PREVIEW_PACE)
    return TankCard(
        state,
        CARD_PREVIEW_VEHICLE,
        CARD_PREVIEW_SUMMARY,
        CARD_PREVIEW_TANK,
        mastery=CARD_PREVIEW_MASTERY,
        own_mastery=CARD_PREVIEW_OWN_MASTERY,
        research=research_state(CARD_PREVIEW_RESEARCH),
        class_tag=PREVIEW_CLASS,
        tier=CARD_PREVIEW_TIER,
    )


def card_preview_text(settings, translate):
    return card_text(card_preview(), settings, translate)


def card_preview_widget(settings, translate):
    return tank_card(card_preview(), settings, translate)


# The component catalogue pictures the feature by the hangar Tank card at its defaults (tools/build/previews).
def catalog_preview_text(translate):
    return card_preview_text(Settings({}, CARD_SCHEMA), translate)


def catalog_preview_widget(translate):
    return card_preview_widget(Settings({}, CARD_SCHEMA), translate)
