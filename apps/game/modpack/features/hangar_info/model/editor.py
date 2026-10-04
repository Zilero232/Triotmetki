from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.editor import editor_spec, sample
from ..settings import SECTION
from . import moment_values
from .constants import EDITOR_GROUPS, SAMPLE_ID, SAMPLE_INFO, SAMPLE_MOMENT
from .ping import valid_ping
from .widget import strip_widget


def sample_strip(settings, translate):
    values = moment_values(SAMPLE_INFO, settings, translate, time.struct_time(SAMPLE_MOMENT))
    return strip_widget(values, settings, valid_ping(SAMPLE_INFO['ping']), translate)


def editor(settings, translate):
    return editor_spec(SECTION, EDITOR_GROUPS, translate,
                       samples=(sample(SECTION, SAMPLE_ID, sample_strip(settings, translate), translate),))
