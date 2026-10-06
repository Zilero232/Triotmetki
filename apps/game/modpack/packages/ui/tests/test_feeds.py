# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import json
import unittest

import _support  # noqa: F401
from otmetki.ui.feeds import FEED_INTERVAL_S, Feed, split_page
from otmetki.ui.protocol import PROTOCOL_VERSION, encode_feed

ITEMS = 1000


def item(index, **values):
    replay = {
        'id': '%04d_20260927_1405_ussr-R04_T-34_05_prohorovka.mtreplay' % index,
        'title': u'Бой %d' % index,
        'size': 1500000 + index,
        'time': 1790507100 - index * 600,
        'map_title': u'Прохоровка',
        'map_image': 'img://gui/maps/icons/map/stats/05_prohorovka.png',
        'tank': u'Т-34',
        'tank_image': 'img://gui/maps/icons/vehicle/ussr-R04_T-34.png',
        'damage': 2150,
        'xp': 1150,
        'favourite': False,
        'site': None,
        'playable': True,
    }
    replay.update(values)
    return replay


def page(items, status='ready', done=ITEMS):
    return {
        'kind': 'replays',
        'status': status,
        'progress': {'done': done, 'total': ITEMS},
        'client': '1.45.0.0',
        'folder': 'C:/replays',
        'upload': 'ready',
        'items': items,
    }


def ids(items):
    return [entry['id'] for entry in items]


def by_id(items):
    return {entry['id']: entry for entry in items}


# The page's side (ui-web applyFeed), for the round trip: a snapshot replaces, a delta on the held base patches.
def apply(held, message):
    if message['base'] is None:
        return {'rev': message['rev'], 'page': message['page'], 'items': list(message['items'])}
    assert held is not None
    assert held['rev'] == message['base']

    removed = set(message['del'])
    kept = [entry for entry in held['items'] if entry['id'] not in removed]
    items = by_id(kept)
    order = ids(kept)
    for entry in message['set']:
        if entry['id'] not in items:
            order.append(entry['id'])
        items[entry['id']] = entry
    return {'rev': message['rev'], 'page': message['page'], 'items': [items[key] for key in order]}


def changed_items(items):
    changed = list(items)
    changed[3] = item(3, favourite=True)
    changed.append(item(ITEMS, title='new'))
    del changed[10]
    return changed


class SplitPageTest(unittest.TestCase):

    def test_the_page_keeps_its_own_keys_without_the_items(self):
        meta, _ = split_page(page([item(0), item(1)]))

        assert 'items' not in meta
        assert meta['status'] == 'ready'

    def test_the_items_keep_their_order(self):
        _, items = split_page(page([item(0), item(1)]))

        assert ids(items) == [item(0)['id'], item(1)['id']]

    def test_no_page(self):
        assert split_page(None) == (None, [])

    def test_items_without_an_id_are_dropped(self):
        split = split_page({'kind': 'replays', 'items': [{'title': 'no id'}, 'x']})

        assert split == ({'kind': 'replays'}, [])


class FeedMessageTest(unittest.TestCase):

    def setUp(self):
        self.items = [item(index) for index in range(ITEMS)]
        self.feed = Feed('replay_manager')

    def test_the_first_message_is_a_snapshot(self):
        first = self.feed.message(page(self.items), 0.0)

        assert first['base'] is None
        assert first['rev'] == 1
        assert len(first['items']) == ITEMS
        assert 'items' not in first['page']

    def test_nothing_changed_is_no_message(self):
        self.feed.message(page(self.items), 0.0)

        assert self.feed.message(page(self.items), 5.0) is None

    def test_a_delta_carries_only_what_changed(self):
        self.feed.message(page(self.items), 0.0)
        changed = changed_items(self.items)

        delta = self.feed.message(page(changed), 10.0)

        assert delta['base'] == 1
        assert delta['rev'] == 2
        assert ids(delta['set']) == [changed[3]['id'], item(ITEMS)['id']]
        assert delta['del'] == [self.items[10]['id']]

    def test_the_page_alone_changes(self):
        self.feed.message(page(self.items, status='indexing', done=10), 0.0)

        delta = self.feed.message(page(self.items), 3.0)

        assert delta['set'] == []
        assert delta['del'] == []
        assert delta['page']['status'] == 'ready'

    def test_deltas_rebuild_the_page(self):
        held = apply(None, self.feed.message(page(self.items[:600], status='indexing', done=600), 0.0))
        steps = [
            self.items[:900],
            self.items[:900],
            [item(0, favourite=True)] + self.items[1:900],
            self.items[1:ITEMS],
            [],
        ]

        for number, items in enumerate(steps):
            message = self.feed.message(page(items), 3.0 * (number + 1))
            if message is not None:
                held = apply(held, message)
            assert sorted(ids(held['items'])) == sorted(ids(items))
            assert by_id(held['items']) == by_id(items)

        assert held['page']['status'] == 'ready'

    def test_a_reset_sends_a_snapshot_with_a_newer_revision(self):
        self.feed.message(page(self.items), 0.0)
        self.feed.reset()

        again = self.feed.message(page(self.items), 1.0)

        assert again['base'] is None
        assert again['rev'] == 2
        assert len(again['items']) == ITEMS

    def test_no_page_is_an_empty_snapshot(self):
        first = self.feed.message(None, 0.0)

        assert first['page'] is None
        assert first['items'] == []

    def test_still_no_page_is_no_message(self):
        self.feed.message(None, 0.0)

        assert self.feed.message(None, 3.0) is None

    def test_a_page_after_no_page_is_a_delta(self):
        self.feed.message(None, 0.0)

        delta = self.feed.message(page(self.items[:1]), 6.0)

        assert delta['set'] == self.items[:1]


class FeedDueTest(unittest.TestCase):

    def setUp(self):
        self.feed = Feed('replay_manager')

    def synced_feed(self):
        self.feed.message(page([item(0)]), 0.0)
        return self.feed

    def test_a_new_feed_is_due_at_once(self):
        assert self.feed.due(0.0)

    def test_polls_are_throttled(self):
        feed = self.synced_feed()

        assert not feed.due(FEED_INTERVAL_S - 0.1)

    def test_forced_reads_are_not_throttled(self):
        feed = self.synced_feed()

        assert feed.due(FEED_INTERVAL_S - 0.1, force=True)

    def test_a_poll_is_due_after_the_interval(self):
        feed = self.synced_feed()

        assert feed.due(FEED_INTERVAL_S)

    def test_a_reset_feed_is_due_at_once(self):
        feed = self.synced_feed()

        feed.reset()

        assert feed.due(0.5)


class FeedSizeTest(unittest.TestCase):

    def setUp(self):
        self.items = [item(index) for index in range(ITEMS)]
        self.feed = Feed('replay_manager')
        self.snapshot = encode_feed(self.feed.message(page(self.items), 0.0))

    def test_the_snapshot_carries_the_protocol_version(self):
        assert json.loads(self.snapshot)['v'] == PROTOCOL_VERSION

    def test_a_snapshot_is_large(self):
        assert len(self.snapshot) > 300 * 1024

    def test_a_delta_of_one_item_is_small(self):
        changed = list(self.items)
        changed[5] = item(5, favourite=True)

        delta = encode_feed(self.feed.message(page(changed), 3.0))

        assert len(delta) < 1024

    def test_a_progress_update_is_smaller_still(self):
        progress = encode_feed(self.feed.message(page(self.items, status='indexing', done=999), 6.0))

        assert len(progress) < 512


if __name__ == '__main__':
    unittest.main()
