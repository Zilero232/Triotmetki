export const GAMEFACE = {
  globals: {
    model: 'model',
    engine: 'engine',
    viewEnv: 'viewEnv',
    subViews: 'subViews',
    resources: 'R'
  },
  engine: {
    whenReady: 'whenReady',
    on: 'on',
    call: 'call',
    dataChangedEvent: 'viewEnv.onDataChanged',
    clientResized: 'clientResized',
    scaleUpdated: 'self.onScaleUpdated'
  },
  dataChanged: {
    register: 'addDataChangedCallback',
    path: 'model',
    rootId: 0,
    trackSubItems: true
  },
  subViews: {
    ids: 'ids',
    get: 'get'
  },
  viewEnv: {
    clientSize: 'getClientSizePx',
    clientSizeRem: 'getClientSizeRem',
    viewPosition: 'getViewGlobalPositionRem',
    viewSize: 'getViewSizeRem',
    remToPx: 'remToPx',
    resizeView: 'resizeViewPx',
    inputArea: 'setInputArea',
    mousePosition: 'getMouseGlobalPositionPx'
  },
  model: {
    state: 'state',
    feed: 'feed',
    escape: 'escape',
    send: 'send',
    nested: 'model'
  },
  viewEvent: {
    handle: 'handleViewEvent',
    eventType: 'GFViewEventProxy',
    valueType: 'GFValueProxy',
    tooltip: 1,
    targetId: 0
  },
  tooltip: {
    content: ['views', 'common', 'tooltip_window', 'simple_tooltip_content', 'SimpleTooltipContent'],
    decorator: ['views', 'common', 'tooltip_window', 'tooltip_window', 'TooltipWindow'],
    resourceArg: 'resId'
  },
  sound: {
    event: 'PlaySound',
    names: { hover: 'highlight', click: 'play' }
  },
  log: {
    noModel: '[OTMETKI] no Gameface model:'
  }
} as const;
