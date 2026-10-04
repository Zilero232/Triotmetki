from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.moe import ThresholdCurve
from .battle import LiveTotals, card_text, card_widget, last_view, live_moe, live_view
from .battle.constants import (
    PREVIEW_BATTLE,
    PREVIEW_CURVE,
    PREVIEW_FONT_SIZE,
    PREVIEW_LAST,
    PREVIEW_PROGRESS,
    PREVIEW_SNAPSHOT,
    PREVIEW_STATS,
)


def _font_size(settings):
    return settings.get('font_size') or PREVIEW_FONT_SIZE


def _sample_totals():
    totals = LiveTotals()
    for key, value in PREVIEW_STATS.items():
        totals.add(key, value)
    return totals


def live_sample(translate):
    totals = _sample_totals()
    moe = live_moe(PREVIEW_SNAPSHOT, totals.combined(), ThresholdCurve.from_api(PREVIEW_CURVE))
    battle = dict(PREVIEW_BATTLE, stats=totals.stats(), moe=moe, progress=PREVIEW_PROGRESS)
    return live_view(battle, translate)


def last_sample(translate):
    return last_view(PREVIEW_LAST, translate)


def live_preview_text(settings, translate):
    return card_text(live_sample(translate), _font_size(settings))


def live_preview_widget(settings, translate):
    return card_widget(live_sample(translate))


def last_preview_text(settings, translate):
    return card_text(last_sample(translate), _font_size(settings))


def last_preview_widget(settings, translate):
    return card_widget(last_sample(translate))


# The component's catalog picture (tools/build/previews): the in-battle summary.
preview_text = live_preview_text
preview_widget = live_preview_widget
