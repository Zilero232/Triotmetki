import type { NativeTooltip, ResourceIdInput, TooltipText, ValueProxyInput, ViewEventInput } from './tooltip.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, readGlobal } from '../scope';

const isNode = (value: unknown): value is object => (typeof value === 'object' || typeof value === 'function') && value !== null;

const resourceId = ({ root, path }: ResourceIdInput): number | null => {
  let parent: unknown = null;
  let node = root;

  for (const key of path) {
    if (!isNode(node)) {
      return null;
    }

    parent = node;
    node = Reflect.get(node, key);
  }

  if (typeof node !== 'function') {
    return null;
  }

  const id: unknown = Reflect.apply(node, parent, [GAMEFACE.tooltip.resourceArg]);

  return typeof id === 'number' ? id : null;
};

const valueProxy = ({ name, value }: ValueProxyInput) => ({ __Type: GAMEFACE.viewEvent.valueType, name, string: value });

const eventArguments = (text: TooltipText | undefined) =>
  text
    ? { isMouseEvent: true, arguments: [valueProxy({ name: 'header', value: text.header ?? '' }), valueProxy({ name: 'body', value: text.body })] }
    : {};

const createNativeTooltip = (scope: object): NativeTooltip => {
  const viewEnv = () => readGlobal({ scope, name: GAMEFACE.globals.viewEnv });

  const ids = () => {
    const resources: unknown = Reflect.get(scope, GAMEFACE.globals.resources);
    const contentID = resourceId({ root: resources, path: GAMEFACE.tooltip.content });
    const decoratorID = resourceId({ root: resources, path: GAMEFACE.tooltip.decorator });

    return contentID === null || decoratorID === null ? null : { contentID, decoratorID };
  };

  const available = (): boolean => typeof viewEnv()?.[GAMEFACE.viewEvent.handle] === 'function' && ids() !== null;

  const sendEvent = ({ on, text }: ViewEventInput): boolean => {
    const resources = ids();

    if (resources === null) {
      return false;
    }

    const event = {
      __Type: GAMEFACE.viewEvent.eventType,
      type: GAMEFACE.viewEvent.tooltip,
      targetID: GAMEFACE.viewEvent.targetId,
      on,
      ...resources,
      ...eventArguments(text)
    };

    invoke({ target: viewEnv(), method: GAMEFACE.viewEvent.handle, args: [event] });

    return true;
  };

  return {
    available,
    show: (text) => available() && sendEvent({ on: true, text }),
    hide: () => {
      sendEvent({ on: false });
    }
  };
};

export const nativeTooltip = createNativeTooltip(globalThis);
