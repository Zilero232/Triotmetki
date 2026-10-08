import { MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { MutationTranslator, MutationTranslatorInput, MutationTranslatorScope } from './mutation-feedback.types';

const translators: Record<MutationTranslatorScope, MutationTranslator | null> = { root: null, page: null };

export const setMutationTranslator = ({ scope, translate }: MutationTranslatorInput) => {
  translators[scope] = translate;
};

const activeTranslator = () => translators.page ?? translators.root;

export const createMutationCache = () =>
  new MutationCache({
    onSuccess: (_data, _variables, _result, _mutation, { client, meta }) => {
      const translate = activeTranslator();

      if (meta?.successKey && translate) {
        toast.success(translate(meta.successKey));
      }

      return Promise.all((meta?.invalidates ?? []).map((queryKey) => client.invalidateQueries({ queryKey })));
    },
    onError: (error, _variables, _result, _mutation, { meta }) => {
      const key = typeof meta?.errorKey === 'function' ? meta.errorKey(error) : meta?.errorKey;
      const translate = activeTranslator();

      if (key && translate) {
        toast.error(translate(key));
      }
    }
  });
