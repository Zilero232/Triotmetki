import type { ReactNode } from 'react';

export type MessagesComponent<P> = (props: P) => Promise<ReactNode> | ReactNode;

export type WithMessagesInput<P> = {
  component: MessagesComponent<P>;
  messages: readonly string[];
};
