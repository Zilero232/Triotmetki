import { MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { MutationTranslator } from './mutation-feedback.types';

const feedback: { translate: MutationTranslator | null } = { translate: null };

export const setMutationTranslator = (translate: MutationTranslator | null) => {
  feedback.translate = translate;
};

export const createMutationCache = () =>
  new MutationCache({
    onSuccess: (_data, _variables, _result, _mutation, { client, meta }) => {
      if (meta?.successKey && feedback.translate) {
        toast.success(feedback.translate(meta.successKey));
      }

      return Promise.all((meta?.invalidates ?? []).map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: (error, _variables, _result, _mutation, { meta }) => {
      const key = typeof meta?.errorKey === 'function' ? meta.errorKey(error) : meta?.errorKey;

      if (key && feedback.translate) {
        toast.error(feedback.translate(key));
      }
    }
  });
