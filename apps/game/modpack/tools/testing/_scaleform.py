"""The Scaleform side of the RU 1.45 client the inject host (core/client/inject) talks to, stubbed for the smoke tests:

- gui/Scaleform/framework: ComponentSettings, ScopeTemplates, g_entitiesFactories (addSettings by alias);
- gui/Scaleform/framework/entities/inject_component_adaptor.py: InjectComponentAdaptor, whose _populate makes the
  Gameface view (_makeInjectView) and loads it, and whose _dispose finalizes it;
- gui/Scaleform/framework/entities/View.py: ViewKey;
- gui/shared: g_eventBus with AppLifeCycleEvent, gui/app_loader/settings.py: APP_NAME_SPACE;
- an app (AbstractApplication) with its AS3 ClassFactory (utils.classFactory.getObject), loaderManager.onViewLoaded
  and containerManager; a Scaleform view (BaseDAAPIComponent) with its AS3 display list and
  registerFlashComponent / unregisterFlashComponent;
- gui/Scaleform/daapi/view/battle/shared/page.py: SharedPage, the battle page the stock suppression and the cover watch
  hook (`_populate`, `_dispose`, `_setComponentsVisibility`), with the components it shows and hides in Flash
  (`as_setComponentsVisibilityS`); a fresh class per `Scaleform`, so the hooks of one story never reach the next.

`Scaleform(has_factory, loads_page).install()` stubs the modules; `load_view(app, alias, covers)` loads a view the way
the app's loader does, `load_battle_page(alias, components)` populates and loads a battle page with its stock
components and the children that cover the HUD, and `destroy_view(app, view)` destroys a view with its components;
`page(view, alias)` is the Gameface view an adaptor put into it. `app_loader` stands in for IAppLoader (getApp,
getDefLobbyApp, getDefBattleApp).
"""
from __future__ import absolute_import, division, print_function

import sys
import types

import _support

GF_INJECT_CLASS = 'net.wg.gui.components.containers.inject.GFInjectComponent'
APP_NAME_SPACE = {'SF_LOBBY': 'scaleform/lobby', 'SF_BATTLE': 'scaleform/battle'}
LIFECYCLE = {'INITIALIZED': 'app/initialized', 'DESTROYED': 'app/destroyed'}
BATTLE_COVERS = ('battleLoading', 'fullStats', 'radialMenu')


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class Namespace(object):

    def __init__(self, **attrs):
        self.__dict__.update(attrs)


class EventBus(object):

    def __init__(self):
        self.listeners = []

    def addListener(self, event_type, handler, scope=None):
        self.listeners.append((event_type, handler))

    def removeListener(self, event_type, handler, scope=None):
        self.listeners.remove((event_type, handler))

    def fire(self, event_type, namespace):
        event = Namespace(eventType=event_type, ns=APP_NAME_SPACE[namespace])
        for listened, handler in list(self.listeners):
            if listened == event_type:
                handler(event)


class ComponentSettings(object):

    def __init__(self, alias, clazz, scope):
        self.alias = alias
        self.clazz = clazz
        self.scope = scope


class EntitiesFactories(object):

    def __init__(self):
        self.settings = {}

    def addSettings(self, settings):
        self.settings[settings.alias] = settings


class InjectComponentAdaptor(object):

    loads_page = True

    def __init__(self):
        self.alias = None
        self.view = None

    def setAlias(self, alias):
        self.alias = alias

    def getAlias(self):
        return self.alias

    def _populate(self):
        self.view = self._makeInjectView()
        if self.loads_page:
            self.view._onLoading()

    def _dispose(self):
        view, self.view = self.view, None
        if view is not None:
            view._finalize()


class InjectComponent(object):

    def __init__(self):
        self.mouseEnabled = True
        self.mouseChildren = True
        self.x = 0
        self.y = 0


class DisplayList(object):
    """The AS3 root of a view: its children in z-order (the last one on top), the named ones as members."""

    def __init__(self, covers=()):
        self.children = []
        for name in covers:
            child = Namespace(name=name)
            setattr(self, name, child)
            self.children.append(child)

    def addChild(self, child):
        self.children.append(child)

    def removeChild(self, child):
        self.children.remove(child)

    def getChildIndex(self, child):
        return self.children.index(child)

    def setChildIndex(self, child, index):
        self.children.remove(child)
        self.children.insert(index, child)


class ScaleformView(object):

    def __init__(self, app, factories, alias, covers=()):
        self.app = app
        self.factories = factories
        self.alias = alias
        self.flashObject = DisplayList(covers)
        self.components = {}

    def registerFlashComponent(self, component, alias):
        adaptor = self.factories.settings[alias].clazz()
        adaptor.setAlias(alias)
        self.components[alias] = adaptor
        adaptor._populate()

    def isFlashComponentRegistered(self, alias):
        return alias in self.components

    def unregisterFlashComponent(self, alias):
        self.components.pop(alias)._dispose()

    def destroy(self):
        for alias in list(self.components):
            self.unregisterFlashComponent(alias)


class StockComponent(object):

    def _dispose(self):
        pass


def shared_page_class():
    """A fresh SharedPage: `hidden` is what the page has off the screen in Flash."""

    class SharedPage(object):

        def _populate(self):
            self.hidden = set()
            self.disposed = False

        def _dispose(self):
            self.disposed = True

        def _setComponentsVisibility(self, visible=None, hidden=None):
            self.as_setComponentsVisibilityS(visible or set(), hidden or set())

        def as_setComponentsVisibilityS(self, visible, hidden):
            self.hidden = (self.hidden | set(hidden)) - set(visible)

        def as_isComponentVisibleS(self, alias):
            return alias not in self.hidden

        def as_getComponentsVisibilityS(self):
            return [alias for alias in self.components if alias not in self.hidden]

        def isGuiVisible(self):
            return True

        def isDisposed(self):
            return self.disposed

    return SharedPage


class ClassFactory(object):

    def __init__(self):
        self.made = []

    def getObject(self, name):
        if name != GF_INJECT_CLASS:
            return None
        component = InjectComponent()
        self.made.append(component)
        return component


class Containers(object):

    def __init__(self):
        self.views = {}

    def isViewCreated(self, key):
        return key in self.views

    def getViewByKey(self, key):
        return self.views[key]


class ScaleformApp(object):

    def __init__(self, has_factory):
        self.factory = ClassFactory() if has_factory else None
        utils = Namespace(classFactory=self.factory) if has_factory else Namespace()
        self.flashObject = Namespace(utils=utils)
        self.loaderManager = Namespace(onViewLoaded=Event())
        self.containerManager = Containers()


class Scaleform(object):

    def __init__(self, has_factory=True, loads_page=True):
        self.factories = EntitiesFactories()
        self.bus = EventBus()
        self.loads_page = loads_page
        self.lobby = ScaleformApp(has_factory)
        self.battle = ScaleformApp(has_factory)
        self.shared_page = shared_page_class()
        self.battle_page = type(str('BattlePage'), (ScaleformView, self.shared_page), {'_fullStatsAlias': 'fullStats'})
        self.app_loader = Namespace(
            getApp=lambda appNS=None: self.lobby,
            getDefLobbyApp=lambda: self.lobby,
            getDefBattleApp=lambda: self.battle,
        )

    def install(self):
        adaptor = type(str('InjectComponentAdaptor'), (InjectComponentAdaptor,), {'loads_page': self.loads_page})
        _stub('gui.Scaleform.framework', True, ComponentSettings=ComponentSettings,
              ScopeTemplates=Namespace(DEFAULT_SCOPE='default'), g_entitiesFactories=self.factories)
        _stub('gui.Scaleform.framework.entities', True)
        _stub('gui.Scaleform.framework.entities.inject_component_adaptor', InjectComponentAdaptor=adaptor)
        _stub('gui.Scaleform.framework.entities.View', ViewKey=lambda alias, name=None: alias)
        _stub('gui.app_loader', True)
        _stub('gui.app_loader.settings', APP_NAME_SPACE=Namespace(**APP_NAME_SPACE))
        events = Namespace(AppLifeCycleEvent=Namespace(**LIFECYCLE))
        _stub('gui.shared', True, events=events, g_eventBus=self.bus, EVENT_BUS_SCOPE=Namespace(GLOBAL='global'))
        _stub('gui.Scaleform.daapi.view.battle.shared.page', SharedPage=self.shared_page)
        return self

    def load_view(self, app, alias, covers=()):
        view = ScaleformView(app, self.factories, alias, covers)
        app.containerManager.views[alias] = view
        app.loaderManager.onViewLoaded(view)
        return view

    def load_battle_page(self, alias='classicBattlePage', components=()):
        page = self.battle_page(self.battle, self.factories, alias, BATTLE_COVERS)
        page.components.update((name, StockComponent()) for name in components)
        page._populate()
        self.battle.containerManager.views[alias] = page
        self.battle.loaderManager.onViewLoaded(page)
        return page

    def destroy_view(self, app, view):
        app.containerManager.views.pop(view.alias, None)
        if isinstance(view, self.shared_page):
            view._dispose()
        view.destroy()

    def create_app(self, namespace):
        self.bus.fire(LIFECYCLE['INITIALIZED'], namespace)

    def destroy_app(self, namespace):
        self.bus.fire(LIFECYCLE['DESTROYED'], namespace)

    @staticmethod
    def page(view, alias):
        adaptor = view.components.get(alias)
        return adaptor.view if adaptor is not None else None


def _stub(name, is_package=False, **attrs):
    _support.stub_parents(name)
    stub = sys.modules.get(name)
    if stub is None:
        stub = types.ModuleType(str(name))
        sys.modules[name] = stub
    if is_package and not hasattr(stub, '__path__'):
        stub.__path__ = []
    stub.__dict__.update(attrs)
    _support.link_to_parent(name)
    return stub
