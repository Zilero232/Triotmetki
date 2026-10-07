from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import NOTIFIER_NOT_SHOWN, NOTIFIER_READS, NOTIFIER_SHOWN


def stock_notifier_shows(reads):
    return all(reads.get(name) is True for name in NOTIFIER_READS)


def notifier_decision(reads):
    values = ' '.join('%s=%s' % (name, reads.get(name)) for name in NOTIFIER_READS)
    template = NOTIFIER_SHOWN if stock_notifier_shows(reads) else NOTIFIER_NOT_SHOWN
    return template % values
