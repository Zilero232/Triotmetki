import { useState } from 'react';

import type { UiComponent } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol';

import type { RunActionInput } from './use-card-actions.types';

export const useCardActions = (component: UiComponent) => {
  const [pending, setPending] = useState<RunActionInput | null>(null);

  const perform = ({ action, row, value }: RunActionInput): void => {
    setPending(null);

    if (action.link) {
      send({ type: 'open', path: action.link });

      return;
    }

    send({ type: 'action', component: component.id, action: action.id, row, value });
  };

  const run = (input: RunActionInput): void => {
    if (input.action.confirm) {
      setPending(input);

      return;
    }

    perform(input);
  };

  return {
    actionItems: component.actions.map((action) => ({ id: action.id, label: action.label, onClick: () => run({ action }) })),
    confirmText: pending?.action.confirm ?? null,
    run,
    confirm: () => {
      if (pending) {
        perform(pending);
      }
    },
    cancel: () => setPending(null)
  };
};
