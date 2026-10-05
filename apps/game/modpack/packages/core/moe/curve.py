from __future__ import absolute_import, division, print_function, unicode_literals

from ..compat import is_number
from .constants import ESTIMATE_MIN_PERCENT, ESTIMATE_SHAPE


class ThresholdCurve(object):
    """The site's damage-for-percent curve of one tank (GET /v1/moe/<tank_id>): thresholds and an optional
    dense curve, sorted and made monotonic; linear interpolation both ways."""

    def __init__(self, points):
        cleaned = {}
        for percent, damage in points:
            if is_number(percent) and is_number(damage) and 0.0 <= percent <= 100.0 and damage >= 0:
                cleaned[float(percent)] = float(damage)
        cleaned[0.0] = 0.0
        monotonic = []
        for percent, damage in sorted(cleaned.items()):
            if monotonic and damage <= monotonic[-1][1]:
                continue
            monotonic.append((percent, damage))
        self.points = monotonic

    def is_usable(self):
        return len(self.points) >= 2

    @property
    def max_percent(self):
        return self.points[-1][0]

    @classmethod
    def from_api(cls, data):
        if not isinstance(data, dict):
            return None
        points = []
        thresholds = data.get('thresholds')
        if isinstance(thresholds, dict):
            for key, value in thresholds.items():
                try:
                    points.append((float(key), value))
                except (TypeError, ValueError):
                    continue
        curve = data.get('curve')
        if isinstance(curve, list):
            for entry in curve:
                if isinstance(entry, dict):
                    points.append((entry.get('percent'), entry.get('damage')))
        result = cls(points)
        return result if result.is_usable() else None

    def percent_for(self, avg):
        if avg <= 0:
            return 0.0
        for index in range(1, len(self.points)):
            p0, d0 = self.points[index - 1]
            p1, d1 = self.points[index]
            if avg <= d1:
                return p0 + (avg - d0) * (p1 - p0) / (d1 - d0)
        return self.max_percent

    def damage_for(self, percent):
        if percent < 0 or percent > self.max_percent:
            return None
        for index in range(1, len(self.points)):
            p0, d0 = self.points[index - 1]
            p1, d1 = self.points[index]
            if percent <= p1:
                return d0 + (percent - p0) * (d1 - d0) / (p1 - p0)
        return self.points[-1][1]


def estimated_curve(moving_avg, percent):
    """The curve of a tank the site has no thresholds for: ESTIMATE_SHAPE through the dossier's own point (the EMA at
    the percent), so the projection and the needs work from the first battle. None without a usable point."""
    if not (is_number(moving_avg) and is_number(percent)) or moving_avg <= 0:
        return None
    if not ESTIMATE_MIN_PERCENT <= percent <= ESTIMATE_SHAPE[-1][0]:
        return None
    shape = ThresholdCurve(ESTIMATE_SHAPE)
    unit = moving_avg / shape.damage_for(percent)
    return ThresholdCurve([(level, ratio * unit) for level, ratio in ESTIMATE_SHAPE])


def next_level(current_percent, curve, levels):
    for level in levels:
        if level > current_percent and level <= curve.max_percent:
            return level
    return None


def threshold_problem(status, data, curve):
    """Why a GET /v1/moe/<tank_id> answer gave no usable curve (the site's error text, or the status), None when it
    did. Thresholds are public: the read needs no binding, so a missing curve is the site's answer or the network."""
    if curve is not None:
        return None
    error = data.get('error') if isinstance(data, dict) else None
    if status == 200:
        return 'the answer has no usable thresholds'
    if error:
        return 'the site answered %s: %s' % (status, error)
    return 'the site answered %s' % (status,) if status else 'no answer (network)'
