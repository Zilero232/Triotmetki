from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.editor import editor_spec, sample
from ..settings import SECTION
from .constants import CHOSEN, EDITOR_GROUPS, STOCK
from .widget import circle_widget


def editor(settings, translate):
    samples = (
        sample(SECTION, STOCK, circle_widget(STOCK), translate),
        sample(SECTION, CHOSEN, circle_widget(settings.get('size')), translate),
    )
    return editor_spec(SECTION, EDITOR_GROUPS, translate, samples=samples)
