from __future__ import absolute_import, division, print_function, unicode_literals

DIR_NAME = 'TriOtmetki'
APPDATA_ENV = 'APPDATA'
WINDOWS_ROAMING = ('AppData', 'Roaming')
POSIX_CONFIG = '.config'

STAMPS_NAME = 'saved_at.json'
STAMPS_VERSION = 1

# A mod installer or cleaner may delete mods/configs; these are what a player cannot
# recreate by hand: the binding, the settings, the HUD layout, the profiles and the app state.
DURABLE_FILES = ('credentials.json', 'config.json', 'components.json', 'profiles.json', 'state.json')
SECRET_FILES = ('credentials.json',)
SECRET_MODE = 0o600

# NTFS keeps mtime in 100 ns steps and FAT in 2 s; a copy counts as newer only past this margin.
STAMP_TOLERANCE_S = 0.01

# Python 2 decodes a lossy ANSI environment value into '?' where the code page has no character.
LOSSY_CHAR = '?'
ENV_BUFFER_CHARS = 32768

# The device secret leaves the game folder (often zipped and shared) and is kept only in %APPDATA%, sealed with DPAPI
# for the current Windows user. The manager seals and opens it with the same entropy and flags.
DPAPI_ENTROPY = b'triotmetki-device-v1'
CRYPTPROTECT_UI_FORBIDDEN = 0x01
