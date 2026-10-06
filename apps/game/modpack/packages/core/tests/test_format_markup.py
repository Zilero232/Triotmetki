# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.format import Markup, escape, font, font_color
from otmetki.core.templates import render_markup


class EscapeTest(unittest.TestCase):

    def test_tags_and_ampersands_become_entities(self):
        assert escape(u'<b>a & b</b>') == u'&lt;b&gt;a &amp; b&lt;/b&gt;'

    def test_an_entity_in_the_text_is_shown_as_written(self):
        assert escape(u'&lt;') == u'&amp;lt;'

    def test_markup_passes_through(self):
        assert escape(Markup(u'<b>x</b>')) == u'<b>x</b>'

    def test_a_number_becomes_text(self):
        assert escape(390) == u'390'

    def test_the_result_is_markup(self):
        assert isinstance(escape(u'x'), Markup)


class FontColorTest(unittest.TestCase):

    def test_six_hex_digits_are_a_colour(self):
        assert font_color(u'#7CD35B') == u'#7CD35B'

    def test_eight_hex_digits_are_a_colour(self):
        assert font_color(u'#FF7cd35b') == u'#FF7cd35b'

    def test_a_quote_cannot_close_the_attribute(self):
        assert font_color(u'#FFFFFF" size="99') is None

    def test_a_trailing_newline_is_not_a_colour(self):
        assert font_color(u'#FFFFFF\n') is None

    def test_a_colour_name_is_not_a_colour(self):
        assert font_color(u'red') is None

    def test_none_is_not_a_colour(self):
        assert font_color(None) is None


class FontTest(unittest.TestCase):

    def test_wraps_text_in_a_font_tag(self):
        assert font(u'390', u'#FFFFFF') == u'<font color="#FFFFFF">390</font>'

    def test_carries_the_size(self):
        assert font(u'390', u'#FFFFFF', 14) == u'<font color="#FFFFFF" size="14">390</font>'

    def test_text_cannot_open_a_tag(self):
        assert font(u'<img src="img://x.png"/>', u'#FFFFFF') == u'<font color="#FFFFFF">&lt;img src="img://x.png"/&gt;</font>'

    def test_text_cannot_close_the_tag(self):
        assert font(u'a</font><font size="99">b', u'#FFFFFF') == (
            u'<font color="#FFFFFF">a&lt;/font&gt;&lt;font size="99"&gt;b</font>'
        )

    def test_an_invalid_colour_is_dropped(self):
        assert font(u'x', u'#FFF" onload="y') == u'<font>x</font>'

    def test_an_invalid_colour_keeps_the_size(self):
        assert font(u'x', None, 12) == u'<font size="12">x</font>'

    def test_a_nested_font_stays_markup(self):
        nested = font(font(u'a', u'#000000'), u'#FFFFFF')

        assert nested == u'<font color="#FFFFFF"><font color="#000000">a</font></font>'

    def test_a_joined_line_wrapped_as_markup_stays_markup(self):
        line = Markup(u' '.join([font(u'a', u'#000000'), font(u'b', u'#000000')]))

        assert font(line, u'#FFFFFF') == (
            u'<font color="#FFFFFF"><font color="#000000">a</font> <font color="#000000">b</font></font>'
        )

    def test_a_joined_line_of_plain_text_is_escaped(self):
        line = u' '.join([font(u'a', u'#000000'), u'b'])

        assert font(line, u'#FFFFFF') == u'<font color="#FFFFFF">&lt;font color="#000000"&gt;a&lt;/font&gt; b</font>'

    def test_the_result_is_markup(self):
        assert isinstance(font(u'x', u'#FFFFFF'), Markup)


class RenderMarkupTest(unittest.TestCase):

    def test_the_template_stays_markup(self):
        assert render_markup(u'<b>{dealt}</b>', {'dealt': 2150}) == u'<b>2 150</b>'

    def test_a_text_value_is_escaped(self):
        assert render_markup(u'{vehicle}', {'vehicle': u'<b>T-34</b>'}) == u'&lt;b&gt;T-34&lt;/b&gt;'

    def test_a_markup_value_is_kept(self):
        assert render_markup(u'{icon} {n}', {'icon': Markup(u'<img src="img://a.png"/>'), 'n': 1}) == (
            u'<img src="img://a.png"/> 1'
        )

    def test_an_unknown_name_is_left_as_written(self):
        assert render_markup(u'{typo}', {}) == u'{typo}'

    def test_the_result_is_markup(self):
        assert isinstance(render_markup(u'x', {}), Markup)


if __name__ == '__main__':
    unittest.main()
