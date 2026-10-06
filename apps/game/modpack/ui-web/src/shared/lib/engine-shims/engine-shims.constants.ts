export const ENGINE_PROBE = {
  handlers: ['oninput', 'onfocusin', 'onfocusout', 'onmouseover', 'onmouseout', 'onwheel'],
  hosts: ['MessageChannel', 'setImmediate', 'queueMicrotask']
} as const;

export const ENGINE_SHIMS = {
  focusPairs: [
    ['focus', 'focusin'],
    ['blur', 'focusout']
  ]
} as const;
