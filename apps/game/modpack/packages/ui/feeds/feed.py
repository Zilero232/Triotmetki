from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import FEED_INTERVAL_S, ITEM_ID, ITEMS_KEY


def split_page(page):
    if not isinstance(page, dict):
        return None, []
    meta = {key: value for key, value in page.items() if key != ITEMS_KEY}
    items = [item for item in page.get(ITEMS_KEY) or () if _has_id(item)]
    return meta, items


def _has_id(item):
    return isinstance(item, dict) and item.get(ITEM_ID) is not None


# A large page goes apart from the settings state: a snapshot first, then only what changed (the page's own keys and
# the items added, changed or removed, by `id`). Every message carries its revision and the one it builds on (`base`,
# None for a snapshot), so the page asks for a new snapshot when it does not hold that base.
class Feed(object):

    def __init__(self, component_id, interval_s=FEED_INTERVAL_S):
        self.component = component_id
        self.interval_s = interval_s
        self.rev = 0
        self.synced = False
        self.checked_at = None
        self.meta = None
        self.items = {}

    def reset(self):
        self.synced = False
        self.meta, self.items = None, {}

    def due(self, now, force=False):
        if force or not self.synced or self.checked_at is None:
            return True
        return now - self.checked_at >= self.interval_s

    def message(self, page, now):
        self.checked_at = now
        meta, items = split_page(page)
        known = self.items
        self.items = {item[ITEM_ID]: item for item in items}
        if not self.synced:
            return self._snapshot(meta, items)
        return self._delta(meta, items, known)

    def _snapshot(self, meta, items):
        self.synced, self.meta = True, meta
        self.rev += 1
        return {'feed': self.component, 'rev': self.rev, 'base': None, 'page': meta, 'items': items}

    def _delta(self, meta, items, known):
        changed = [item for item in items if known.get(item[ITEM_ID]) != item]
        removed = sorted(key for key in known if key not in self.items)
        if not changed and not removed and meta == self.meta:
            return None

        base = self.rev
        self.meta = meta
        self.rev += 1
        return {'feed': self.component, 'rev': self.rev, 'base': base, 'page': meta, 'set': changed, 'del': removed}
