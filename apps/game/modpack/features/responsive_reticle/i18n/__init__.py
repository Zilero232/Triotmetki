# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

STRINGS = {
    'ru': {
        'component_responsive_reticle': u'Отзывчивый прицел',
        'component_responsive_reticle_hint': u'Маркер орудия двигается за орудием каждый кадр, а не десять раз в секунду, круг '
                                            u'сведения сужается плавно; сведение и цвет пробития по-прежнему считаются раз в серверный '
                                            u'тик. Пока прицел стоит, работает обычная отрисовка. Только отрисовка: выстрел и наведение '
                                            u'не меняются. Выключен для арты, в реплеях и у орудий без горизонтальной наводки.',
        'responsive_reticle_follow': u'Маркер догоняет орудие',
        'responsive_reticle_follow_instant': u'Сразу, в том же кадре',
        'responsive_reticle_follow_smooth': u'Плавно, с задержкой 50 мс',
    },
    'en': {
        'component_responsive_reticle': u'Responsive reticle',
        'component_responsive_reticle_hint': u'The gun marker follows the gun every frame instead of ten times a second and '
                                            u'the aiming circle shrinks smoothly; the dispersion and the penetration colour are still '
                                            u'worked out once per server tick. While the aim stands still the stock drawing runs. '
                                            u'Drawing only: the shot and the aim stay as they are. Off for SPGs, in replays and on '
                                            u'guns without horizontal traverse.',
        'responsive_reticle_follow': u'The marker catches up with the gun',
        'responsive_reticle_follow_instant': u'At once, in the same frame',
        'responsive_reticle_follow_smooth': u'Smoothly, 50 ms behind',
    },
}
