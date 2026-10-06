# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

STRINGS = {
    'ru': {
        'component_minimap': u'Мини-карта',
        'component_minimap_hint': u'Только то, что есть в настройках игры: размер, прозрачность, последние места и названия техники, свои круги обзора. '
                                  u'Меняется в момент выбора, «Как в игре» ничего не трогает.'
                                  u' Одно исключение — последние места и названия техники, см. их подсказку.',
        'minimap_size': u'Размер',
        'minimap_transparency': u'Прозрачность, %',
        'minimap_vehicle_names': u'Последние места и названия техники',
        'minimap_vehicle_names_hint': u'Настройка игры «Дополнительные возможности мини-карты»: пропавшая из виду '
                                      u'техника остаётся там, где её видели последний раз, и подписана моделью. '
                                      u'«Никогда» в настройках игры убирает и то и другое, поэтому если там стоит '
                                      u'«Никогда», мод один раз включает «Постоянно»; дальнейший выбор здесь или в игре '
                                      u'он не трогает.',
        'minimap_vehicle_names_alt': u'По Alt',
        'minimap_vehicle_names_always': u'Постоянно',
        'minimap_view_range': u'Круг обзора своей техники',
        'minimap_max_view_range': u'Круг максимального обзора',
        'minimap_draw_range': u'Круг отрисовки',
        'minimap_native_restore': u'Вернуть как было',
        'minimap_native_restore_confirm': u'Мод включил круги обзора, последние места и названия техники на мини-карте. '
                                          u'Вернуть настройки миникарты, которые были до мода?',
        'minimap_native_recommended': u'Рекомендуемые настройки',
        'minimap_native_recommended_confirm': u'Круг своего обзора и круг 445 м, последние места и названия техники '
                                              u'постоянно, без круга отрисовки. Текущие настройки сохранятся, их можно вернуть.',
        'minimap_native_failed': u'Не удалось изменить настройки игры, попробуйте ещё раз.',
        'minimap_max_view_range_hint': u'Круг 445 м — дальше этого обзор не бывает ни у какой техники.',
        'minimap_draw_range_hint': u'Граница, дальше которой игра не рисует технику.',
        'minimap_group_map': u'Карта',
        'minimap_group_circles': u'Круги',
    },
    'en': {
        'component_minimap': u'Minimap',
        'component_minimap_hint': u'Only what the game settings offer: size, opacity, last-seen spots and vehicle names, your own range circles. '
                                  u'Applied when you pick a value; "As in the game" changes nothing.'
                                  u' One exception: last-seen spots and vehicle names, see their hint.',
        'minimap_size': u'Size',
        'minimap_transparency': u'Transparency, %',
        'minimap_vehicle_names': u'Last-seen spots and vehicle names',
        'minimap_vehicle_names_hint': u'Game setting "Extended minimap features": a vehicle that left sight stays '
                                      u'where it was last seen, labelled with its model. "Never" in the game '
                                      u'settings drops both, so if the game is at "Never" the mod switches it to '
                                      u'"Always" once; whatever you pick afterwards, here or in the game, stays.',
        'minimap_vehicle_names_alt': u'With Alt',
        'minimap_vehicle_names_always': u'Always',
        'minimap_view_range': u'Own view range circle',
        'minimap_max_view_range': u'Maximum view range circle',
        'minimap_draw_range': u'Draw distance circle',
        'minimap_native_restore': u'Restore my settings',
        'minimap_native_restore_confirm': u'The mod turned the view range circles, last-seen spots and vehicle names on. '
                                          u'Restore the minimap settings you had before the mod?',
        'minimap_native_recommended': u'Recommended settings',
        'minimap_native_recommended_confirm': u'Own view range and the 445 m circle, last-seen spots and vehicle names always, no '
                                              u'draw distance circle. Your current settings are kept so you can restore them.',
        'minimap_native_failed': u'Could not change the game settings, please try again.',
        'minimap_max_view_range_hint': u'The 445 m circle: no vehicle spots further than this.',
        'minimap_draw_range_hint': u'The edge beyond which the game draws no vehicles.',
        'minimap_group_map': u'Map',
        'minimap_group_circles': u'Circles',
    },
}
