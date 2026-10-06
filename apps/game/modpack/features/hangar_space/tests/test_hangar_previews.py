# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import struct
import unittest
import zlib

import _support
from otmetki.features.hangar_space.i18n import STRINGS
from otmetki.features.hangar_space.model import (
    CHECK_CAPTURE,
    CHECK_EXPIRED,
    CHECK_IDLE,
    CHECK_WAIT,
    PREVIEWS,
    CaptureBook,
    GalleryPictures,
    ThumbnailError,
    bitmap_thumbnail,
    build_page,
    data_uri,
    is_clean_hangar,
    preview_file,
    preview_key,
    preview_key_of_file,
)
from otmetki.features.hangar_space.model.constants import PREVIEW_ARM_S, PREVIEW_DATA_PREFIX, PREVIEW_SETTLE_S
from otmetki.features.hangar_space.model.looks import Look
from otmetki.features.hangar_space.model.thumbnail import crop_box

MAIN = 'h08_mt_hangar'
STEEL_HUNTER = 'h33_battle_royale_2021'
MUSEUM_KEY = 'h16_mt_museum'
RAIN = Look('autumn_rain', MAIN, 'h08_mt_hangar_Autumn_TD3')
HANGAR = {'hangar': True, 'blocking': True, 'alive': True, 'own': False}
SETTINGS_WINDOW = {'hangar': False, 'blocking': True, 'alive': True, 'own': True}
HUD_WINDOW = {'hangar': False, 'blocking': False, 'alive': True, 'own': True}
STORE = {'hangar': False, 'blocking': True, 'alive': True, 'own': False}


def bitmap(width, height, pixel, bits=24, top_down=False, bitfields=False):
    pixel_bytes = bits // 8
    stride = (width * bits + 31) // 32 * 4
    row = bytearray(stride)
    for column in range(width):
        red, green, blue = pixel(column)
        row[column * pixel_bytes:column * pixel_bytes + 3] = bytearray((blue, green, red))
    pixels = bytes(row) * height
    masks = struct.pack(str('<III'), 0x00FF0000, 0x0000FF00, 0x000000FF) if bitfields else b''
    offset = 14 + 40 + len(masks)
    header = struct.pack(str('<2sIHHI'), b'BM', offset + len(pixels), 0, 0, offset)
    info = struct.pack(str('<IiiHHIIiiII'), 40, width, -height if top_down else height, 1, bits,
                       3 if bitfields else 0, len(pixels), 0, 0, 0, 0)
    return header + info + masks + pixels


def png_pixels(png):
    width, height = struct.unpack(str('>II'), png[16:24])
    position, stream = 8, b''
    while position < len(png):
        length = struct.unpack(str('>I'), png[position:position + 4])[0]
        kind = png[position + 4:position + 8]
        if kind == b'IDAT':
            stream += png[position + 8:position + 8 + length]
        position += 12 + length
    raw = bytearray(zlib.decompress(stream))
    rows = []
    for index in range(height):
        line = raw[index * (width * 3 + 1):(index + 1) * (width * 3 + 1)]
        values = bytearray(width * 3)
        for offset in range(width * 3):
            left = values[offset - 3] if offset >= 3 else 0
            values[offset] = (line[offset + 1] + left) & 0xFF
        rows.append(values)
    return width, height, rows


def two_halves(width):
    return lambda column: (200, 10, 10) if column < width // 2 else (10, 10, 200)


def translator():
    return _support.translator(STRINGS, 'ru')


class KeyTest(unittest.TestCase):

    def test_a_space_is_keyed_by_its_folder(self):
        assert preview_key(MAIN) == MAIN

    def test_a_look_is_keyed_by_its_space_and_id(self):
        assert preview_key(MAIN, 'autumn_rain') == 'h08_mt_hangar__autumn_rain'

    def test_a_name_that_is_no_folder_has_no_key(self):
        assert preview_key('../evil') is None

    def test_a_look_id_that_is_no_id_has_no_key(self):
        assert preview_key(MAIN, 'a/b') is None

    def test_a_preview_file_reads_back_as_its_key(self):
        key = preview_key(MAIN, 'otm_night')

        assert preview_key_of_file(preview_file(key)) == key

    def test_a_stray_file_in_the_folder_is_no_preview(self):
        assert preview_key_of_file('notes.txt') is None

    def test_a_preview_goes_to_the_page_as_a_png_data_uri(self):
        assert data_uri(b'\x89PNG') == PREVIEW_DATA_PREFIX + 'iVBORw=='


class CleanHangarTest(unittest.TestCase):

    def test_the_plain_hangar_with_the_hud_page_is_clean(self):
        assert is_clean_hangar([HANGAR, HUD_WINDOW]) is True

    def test_the_settings_window_over_the_hangar_is_not_clean(self):
        assert is_clean_hangar([HANGAR, SETTINGS_WINDOW]) is False

    def test_another_lobby_view_is_not_clean(self):
        assert is_clean_hangar([HANGAR, STORE]) is False


class CaptureBookTest(unittest.TestCase):

    def settled(self, book, key, has_preview=False, start=0.0):
        book.check(start, key, has_preview, True)
        return book.check(start + PREVIEW_SETTLE_S, key, has_preview, True)

    def test_an_unarmed_book_takes_no_shot(self):
        book = CaptureBook()

        assert self.settled(book, MAIN) == CHECK_IDLE

    def test_an_armed_book_shoots_a_hangar_without_preview_once_it_settled(self):
        book = CaptureBook()
        book.arm(0.0)

        assert self.settled(book, MAIN) == CHECK_CAPTURE

    def test_the_shot_waits_for_the_scene_to_settle(self):
        book = CaptureBook()
        book.arm(0.0)
        book.check(0.0, MAIN, False, True)

        assert book.check(PREVIEW_SETTLE_S / 2, MAIN, False, True) == CHECK_WAIT

    def test_the_settle_time_starts_again_when_the_window_covers_the_hangar(self):
        book = CaptureBook()
        book.arm(0.0)
        book.check(0.0, MAIN, False, True)
        book.check(1.0, MAIN, False, False)

        assert book.check(PREVIEW_SETTLE_S, MAIN, False, True) == CHECK_WAIT

    def test_one_shot_disarms_the_book(self):
        book = CaptureBook()
        book.arm(0.0)
        self.settled(book, MAIN)

        assert self.settled(book, MUSEUM_KEY, start=10.0) == CHECK_IDLE

    def test_a_space_tried_this_session_is_not_shot_again_on_a_new_pick(self):
        book = CaptureBook()
        book.arm(0.0)
        self.settled(book, MAIN)
        book.arm(10.0)

        assert self.settled(book, MAIN, start=10.0) == CHECK_WAIT

    def test_a_hangar_with_a_preview_is_not_shot_on_a_pick(self):
        book = CaptureBook()
        book.arm(0.0)

        assert self.settled(book, MAIN, has_preview=True) == CHECK_WAIT

    def test_the_refresh_button_shoots_a_hangar_that_has_a_preview(self):
        book = CaptureBook()
        book.arm(0.0, forced_key=MAIN)

        assert self.settled(book, MAIN, has_preview=True) == CHECK_CAPTURE

    def test_an_armed_book_gives_up_after_its_window(self):
        book = CaptureBook()
        book.arm(0.0)

        assert book.check(PREVIEW_ARM_S + 1, MAIN, False, True) == CHECK_EXPIRED

    def test_a_space_still_loading_is_waited_for(self):
        book = CaptureBook()
        book.arm(0.0)

        assert self.settled(book, None) == CHECK_WAIT


class ThumbnailTest(unittest.TestCase):

    def test_a_bottom_up_bitmap_becomes_a_png_of_the_preview_size(self):
        png = bitmap_thumbnail(bitmap(64, 36, two_halves(64)), (16, 9))

        width, height, _ = png_pixels(png)
        assert (width, height) == (16, 9)

    def test_the_colours_keep_their_place_and_channel_order(self):
        png = bitmap_thumbnail(bitmap(64, 36, two_halves(64)), (16, 9))

        _, _, rows = png_pixels(png)
        assert tuple(rows[4][0:3]) == (200, 10, 10)
        assert tuple(rows[4][-3:]) == (10, 10, 200)

    def test_rows_of_a_bottom_up_bitmap_come_out_top_first(self):
        raw = bytearray(bitmap(32, 18, lambda column: (0, 0, 0)))
        stride = 32 * 3
        raw[54:54 + 2 * stride] = bytearray((255,)) * (2 * stride)

        _, _, rows = png_pixels(bitmap_thumbnail(bytes(raw), (16, 9)))

        assert rows[-1][0] == 255
        assert rows[0][0] == 0

    def test_a_top_down_bitmap_reads_as_well(self):
        png = bitmap_thumbnail(bitmap(64, 36, two_halves(64), top_down=True), (16, 9))

        _, _, rows = png_pixels(png)
        assert tuple(rows[0][0:3]) == (200, 10, 10)

    def test_a_32_bit_bitmap_with_the_standard_masks_reads(self):
        png = bitmap_thumbnail(bitmap(64, 36, two_halves(64), bits=32, bitfields=True), (16, 9))

        _, _, rows = png_pixels(png)
        assert tuple(rows[0][-3:]) == (10, 10, 200)

    def test_a_jpeg_is_refused(self):
        with self.assertRaises(ThumbnailError):
            bitmap_thumbnail(b'\xff\xd8\xff\xe0' + b'\x00' * 64, (16, 9))

    def test_a_wide_screen_is_cropped_at_the_sides(self):
        assert crop_box(2560, 1080, (16, 9)) == (320, 0, 1920, 1080)

    def test_a_four_by_three_screen_is_cropped_at_the_top_and_bottom(self):
        assert crop_box(1600, 1200, (16, 9)) == (0, 150, 1600, 900)


class PageTest(unittest.TestCase):

    def rows(self, previews, default=None):
        page = build_page([MAIN, STEEL_HUNTER], u'', MAIN, translator(), looks=[RAIN],
                          pictures=GalleryPictures(previews, default))
        return dict((row['id'], row) for row in page['rows'])

    def test_a_space_tile_shows_its_own_preview(self):
        rows = self.rows({MAIN: 'data:main'})

        assert rows[MAIN]['image'] == 'data:main'

    def test_a_look_tile_shows_the_preview_of_its_look(self):
        rows = self.rows({'h08_mt_hangar__autumn_rain': 'data:rain'})

        assert rows['look:autumn_rain']['image'] == 'data:rain'

    def test_a_space_without_preview_keeps_its_event_art(self):
        rows = self.rows({})

        assert rows[STEEL_HUNTER]['image'] == PREVIEWS[STEEL_HUNTER]

    def test_a_space_without_preview_or_art_has_the_drawn_fallback(self):
        rows = self.rows({})

        assert rows[MAIN]['image'] is None

    def test_the_game_hangar_tile_shows_the_default_hangar_preview(self):
        rows = self.rows({MAIN: 'data:main'}, default=MAIN)

        assert rows['native']['image'] == 'data:main'


if __name__ == '__main__':
    unittest.main()
