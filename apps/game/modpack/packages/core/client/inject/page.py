from __future__ import absolute_import, division, print_function, unicode_literals

from ...inject import PAGE_SEND_COMMAND, PAGE_STATE_PROPERTY, message_of, valid_layout
from ...log import log, safe

try:
    from frameworks.wulf import ViewFlags, ViewModel, ViewSettings
    from gui.impl.pub import ViewImpl
    from gui.Scaleform.framework import ComponentSettings, ScopeTemplates, g_entitiesFactories
    from gui.Scaleform.framework.entities.inject_component_adaptor import InjectComponentAdaptor
    IMPORT_ERROR = None
except Exception as error:  # a client without these classes keeps the core importable
    IMPORT_ERROR = error

try:
    import openwg_gameface
except Exception:  # any failure inside a third-party import must not stop the core
    openwg_gameface = None

_hosts = {}
_registered = set()


def page_layout(key):
    """The layout id OpenWG Gameface gave the res_map item `key`, or None until it validated its res_map."""
    finder = getattr(openwg_gameface, 'res_id_by_key', None)
    if finder is None:
        return None
    try:
        return valid_layout(finder(key))
    except Exception:
        return None


def page_usable():
    """Whether the client has the classes an injected page needs (InjectComponentAdaptor, ViewImpl, the entities
    factory)."""
    return IMPORT_ERROR is None


def bind(alias, host):
    """Route the stock component registered under `alias` to `host` (an InjectHost); registers its ComponentSettings
    with the client's entities factory once per alias. False when the client lacks the classes."""
    if IMPORT_ERROR is not None:
        log('inject: the client has no InjectComponentAdaptor (%s)' % IMPORT_ERROR)
        return False
    _hosts[alias] = host
    if alias not in _registered:
        g_entitiesFactories.addSettings(ComponentSettings(alias, PageInjectAdaptor, ScopeTemplates.DEFAULT_SCOPE))
        _registered.add(alias)
    return True


if IMPORT_ERROR is None:

    class PageViewModel(ViewModel):

        def __init__(self, properties=1, commands=1):
            super(PageViewModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(PageViewModel, self)._initialize()
            self._addStringProperty(PAGE_STATE_PROPERTY, '')
            self.send = self._addCommand(PAGE_SEND_COMMAND)

        def set_state(self, text):
            self._setString(0, text)

    # RU 1.45 client source: inject_component_adaptor.py accepts only ViewFlags.VIEW content and adds it as a child of
    # the main window's view, so the page is a wulf child view, never a window of its own (no focus of its own).
    class PageView(ViewImpl):

        def __init__(self, layout, host):
            super(PageView, self).__init__(ViewSettings(layout, flags=ViewFlags.VIEW, model=PageViewModel()))
            self.host = host

        @property
        def viewModel(self):
            return super(PageView, self).getViewModel()

        def _onLoading(self, *args, **kwargs):
            super(PageView, self)._onLoading(*args, **kwargs)
            self.viewModel.send += self._on_send
            self.host.on_view_loaded(self)

        def _finalize(self):
            self.viewModel.send -= self._on_send
            self.host.on_view_destroyed(self)
            super(PageView, self)._finalize()

        @safe
        def _on_send(self, args=None):
            self.host.on_message(message_of(args))

    class PageInjectAdaptor(InjectComponentAdaptor):

        def _makeInjectView(self, *args):
            host = _hosts[self.getAlias()]
            return PageView(host.layout, host)

        def _dispose(self):
            host = _hosts.get(self.getAlias())
            super(PageInjectAdaptor, self)._dispose()
            if host is not None:
                host.on_adaptor_disposed(self)
