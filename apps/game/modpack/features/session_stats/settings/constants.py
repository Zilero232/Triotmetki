from __future__ import absolute_import, division, print_function, unicode_literals

GROUP = 'hangar'
SWITCH = 'hangar_session_panel'
SECTION = 'session_stats'
IDLE_MINUTES = 'session_idle_minutes'
SHARE = 'share_session_report'
SHARE_CHANNEL = 'share_session_channel'

DEFAULTS = {
    'show_moe': True,
    'show_goals': True,
    'max_goals': 3,
    'show_account': True,
    'metric_wn8': True,
    'metric_win_rate': True,
    'metric_avg_damage': True,
    'metric_eff': False,
}
LIMITS = {'max_goals': (1, 5)}

# The goals count, the idle timeout and the session report are rare choices: the window folds them away.
ADVANCED = ('max_goals', IDLE_MINUTES, SHARE, SHARE_CHANNEL)
