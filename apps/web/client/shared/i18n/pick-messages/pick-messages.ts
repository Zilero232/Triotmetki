import type { AbstractIntlMessages } from 'next-intl';

import { isPlainObject, isString } from 'remeda';

import type { MergeMessagesInput, MessageNode, NestMessagesInput, PickMessagesInput, ValueAtInput } from './pick-messages.types';

const valueAt = ({ messages, segments }: ValueAtInput): MessageNode | undefined =>
  segments.reduce<MessageNode | undefined>((node, segment) => (isPlainObject(node) ? node[segment] : undefined), messages);

const nestUnder = ({ segments, value }: NestMessagesInput): AbstractIntlMessages => {
  const [first = '', ...rest] = segments;

  return { [first]: rest.length === 0 ? value : nestUnder({ segments: rest, value }) };
};

const mergeMessages = ({ target, source }: MergeMessagesInput): AbstractIntlMessages =>
  Object.entries(source).reduce<AbstractIntlMessages>((merged, [key, value]) => {
    const existing = merged[key];
    const isNestedMerge = !isString(existing) && existing !== undefined && !isString(value);

    return { ...merged, [key]: isNestedMerge ? mergeMessages({ target: existing, source: value }) : value };
  }, target);

export const pickMessages = ({ messages, paths }: PickMessagesInput): AbstractIntlMessages =>
  paths.reduce<AbstractIntlMessages>((picked, path) => {
    const segments = path.split('.');
    const value = valueAt({ messages, segments });

    return value === undefined ? picked : mergeMessages({ target: picked, source: nestUnder({ segments, value }) });
  }, {});
