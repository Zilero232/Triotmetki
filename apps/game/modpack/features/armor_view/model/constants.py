from __future__ import absolute_import, division, print_function, unicode_literals

# The site's public armour page of a tank (apps/web/client app/[locale]/(site)/t/[slug]/armor: the slug may be the
# tank id, the client's intCD); next-intl `localePrefix: 'as-needed'`, so the default locale has no prefix.
SITE_URL = 'https://triotmetki.ru'
ARMOR_PATH = '/t/%d/armor'
SITE_LOCALES = ('ru', 'en')
DEFAULT_LOCALE = 'ru'

# The client's own browser (MTWebBrowser) answered the site with HTTP 418 (python.log 2026-10-08), so the external
# browser is the default; the overlay stays a choice for when the site lets the client's browser in.
OPEN_IN_GAME = 'game'
OPEN_IN_BROWSER = 'browser'
OPEN_IN_CHOICES = (OPEN_IN_GAME, OPEN_IN_BROWSER)

# The carousel tank menu item: the site's armour page of that tank.
MENU_OPTION_ID = 'otmetki_armor_view'
MENU_LABEL = 'armor_view_menu'

REFUSAL_OFF = 'armor_view_off'
REFUSAL_BATTLE = 'armor_view_in_battle'
REFUSAL_NO_TANK = 'armor_view_no_tank'

ACTION_SITE = 'site'
