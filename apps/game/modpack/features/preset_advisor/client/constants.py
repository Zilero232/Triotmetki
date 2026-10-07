from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: ammunition_setup_view_model.py reserves 9 properties and 4 commands.
SETUP_MODEL_MODULE = 'gui.impl.gen.view_models.views.lobby.tank_setup.ammunition_setup_view_model'
SETUP_MODEL_CLASS = 'AmmunitionSetupViewModel'
STOCK_PROPERTIES = 9
STOCK_COMMANDS = 4
# OpenWG Gameface's ModInjectModel and our payload model are added to the stock model.
ADDED_PROPERTIES = 2

# openwg_gameface.gf_mod_inject: the page's gui/gameface/js/index.js loads these into the stock view.
INJECT_NAME = 'OtmetkiPresetAdvisor'
SCRIPT_URL = 'coui://gui/gameface/mods/triotmetki/ui/preset_advisor.js'
MODEL_PROPERTY = 'otmetkiPresetAdvisor'
PAYLOAD_PROPERTY = 'payload'
