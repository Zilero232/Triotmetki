# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

STRINGS = {
    'ru': {
        'component_chat_filter': u'Фильтр чата',
        'component_chat_filter_hint': u'Время у сообщений, фильтр повторов, флуда и слов. Ваши сообщения не фильтруются.',
        'chat_filter_timestamp_format': u'Время у сообщений',
        'chat_filter_timestamp_format_': u'Не показывать',
        'chat_filter_filter_duplicates': u'Скрывать повторы',
        'chat_filter_filter_duplicates_hint': u'То же сообщение от того же игрока в течение 30 секунд скрывается.',
        'chat_filter_rate_limit': u'Сообщений от игрока за 10 с',
        'chat_filter_rate_limit_hint': u'Больше сообщений одного игрока за 10 секунд скрываются как флуд. 0 — без ограничения.',
        'chat_filter_filter_commands': u'Ограничивать и быстрые команды',
        'chat_filter_block_words': u'Скрывать сообщения со словами',
        'chat_filter_block_words_hint': u'Через запятую, без учёта регистра.',
    },
    'en': {
        'component_chat_filter': u'Chat filter',
        'component_chat_filter_hint': u'Message times, a filter for repeats, flood and words. Your own messages are never filtered.',
        'chat_filter_timestamp_format': u'Message time',
        'chat_filter_timestamp_format_': u'Hidden',
        'chat_filter_filter_duplicates': u'Hide repeats',
        'chat_filter_filter_duplicates_hint': u'The same message from the same player within 30 seconds is hidden.',
        'chat_filter_rate_limit': u'Messages per player in 10 s',
        'chat_filter_rate_limit_hint': u'More messages from one player within 10 seconds are hidden as flood. 0: no limit.',
        'chat_filter_filter_commands': u'Limit quick commands too',
        'chat_filter_block_words': u'Hide messages with the words',
        'chat_filter_block_words_hint': u'Comma-separated, case-insensitive.',
    },
}
