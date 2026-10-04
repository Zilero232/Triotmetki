# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import time
import unittest

import _support  # noqa: F401
from otmetki.core.settings import Settings
from otmetki.features.chat_filter.i18n import STRINGS
from otmetki.features.chat_filter.model import ChatFilter, normalize, parse_words, stamp
from otmetki.features.chat_filter.settings import SCHEMA, SETTINGS


def chat(**values):
    return ChatFilter(Settings(values, SCHEMA))


def after_one_line(**values):
    chat_filter = chat(**values)
    chat_filter.allow_message('a', u'Все на базу!', 0.0)
    return chat_filter


def after_two_lines():
    chat_filter = chat(rate_limit=2, filter_duplicates=False)
    chat_filter.allow_message('a', '1', 0.0)
    chat_filter.allow_message('a', '2', 1.0)
    return chat_filter


def stamp_moment():
    return time.mktime((2026, 9, 27, 18, 5, 9, 0, 0, -1))


class DuplicateTest(unittest.TestCase):

    def test_a_first_line_is_allowed(self):
        assert chat(rate_limit=0).allow_message('a', u'Все на базу!', 0.0)

    def test_the_same_line_from_the_same_sender_is_hidden(self):
        chat_filter = after_one_line(rate_limit=0)

        assert not chat_filter.allow_message('a', u'<font>все  на базу!</font>', 10.0)

    def test_the_same_line_from_another_sender_is_allowed(self):
        chat_filter = after_one_line(rate_limit=0)

        assert chat_filter.allow_message('b', u'все на базу!', 10.0)

    def test_the_same_line_after_the_window_is_allowed(self):
        chat_filter = after_one_line(rate_limit=0)

        assert chat_filter.allow_message('a', u'все на базу!', 45.0)

    def test_hidden_lines_are_counted(self):
        chat_filter = after_one_line(rate_limit=0)

        chat_filter.allow_message('a', u'все на базу!', 10.0)

        assert chat_filter.hidden == 1


class RateLimitTest(unittest.TestCase):

    def test_a_line_under_the_limit_is_allowed(self):
        chat_filter = chat(rate_limit=2, filter_duplicates=False)
        chat_filter.allow_message('a', '1', 0.0)

        assert chat_filter.allow_message('a', '2', 1.0)

    def test_a_line_over_the_limit_is_hidden(self):
        chat_filter = after_two_lines()

        assert not chat_filter.allow_message('a', '3', 2.0)

    def test_a_line_after_the_window_is_allowed(self):
        chat_filter = after_two_lines()

        assert chat_filter.allow_message('a', '4', 30.0)


class BlockedWordsTest(unittest.TestCase):

    def test_words_are_split_and_lowercased(self):
        assert parse_words(u'нуб, Рак ;бот') == (u'нуб', u'рак', u'бот')

    def test_a_line_with_a_blocked_word_is_hidden(self):
        assert not chat(block_words=u'нуб, Рак ;бот').allow_message('a', u'Ты РАК', 0.0)

    def test_a_line_without_blocked_words_is_allowed(self):
        assert chat(block_words=u'нуб, Рак ;бот').allow_message('a', u'go A', 1.0)


class CommandTest(unittest.TestCase):

    def test_a_first_command_is_allowed(self):
        assert chat(rate_limit=1).allow_command('a', 0.0)

    def test_a_command_over_the_limit_is_hidden(self):
        chat_filter = chat(rate_limit=1)
        chat_filter.allow_command('a', 0.0)

        assert not chat_filter.allow_command('a', 1.0)

    def test_commands_are_allowed_when_their_filter_is_off(self):
        assert chat(rate_limit=1, filter_commands=False).allow_command('a', 1.0)


class StampTest(unittest.TestCase):

    def test_the_stamp_comes_before_the_line(self):
        assert stamp('hi', '%H:%M', stamp_moment()).endswith(' hi')

    def test_the_stamp_is_the_local_time_in_brackets(self):
        assert '[18:05]' in stamp('hi', '%H:%M', stamp_moment())

    def test_no_format_leaves_the_line_alone(self):
        assert stamp('hi', '', stamp_moment()) == 'hi'


class SettingsTest(unittest.TestCase):

    def test_the_rate_limit_is_capped(self):
        assert Settings({'rate_limit': 99}, SCHEMA).get('rate_limit') == 20

    def test_an_unknown_timestamp_format_falls_back_to_the_default(self):
        assert Settings({'timestamp_format': '%s'}, SCHEMA).get('timestamp_format') == '%H:%M:%S'

    def test_a_non_text_line_normalizes_to_nothing(self):
        assert normalize(None) == ''

    def test_the_component_switch_is_battle_chat_filter(self):
        assert SETTINGS == ('battle_chat_filter',)

    def test_both_languages_have_the_same_strings(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])


class FixedSettingsTest(unittest.TestCase):

    def test_the_duplicate_window_s_is_fixed(self):
        assert 'duplicate_window_s' not in SCHEMA.defaults
        assert Settings({'rate_window_s': 60}, SCHEMA).get('rate_window_s') == 10
        assert Settings({'duplicate_window_s': 120}, SCHEMA).get('duplicate_window_s') == 30


if __name__ == '__main__':
    unittest.main()
