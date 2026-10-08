import { QueryClient } from '@tanstack/react-query';
import { createTranslator } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';

import type { MutationFeedbackMeta } from '..';

import { createMutationCache, setMutationTranslator } from '..';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const run = ({ meta, mutationFn }: { meta?: MutationFeedbackMeta; mutationFn: () => Promise<unknown> }) => {
  const client = new QueryClient({ mutationCache: createMutationCache() });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const execution = client.getMutationCache().build(client, { mutationFn, meta }).execute(undefined);

  return { execution, invalidate };
};

beforeEach(() => {
  const t = createTranslator({ locale: 'en', messages: messages.en });

  setMutationTranslator({ scope: 'root', translate: (key) => t(key) });
});

afterEach(() => {
  setMutationTranslator({ scope: 'root', translate: null });
  setMutationTranslator({ scope: 'page', translate: null });
});

describe('createMutationCache', () => {
  it('toasts the success key through the registered translator and invalidates every listed query', async () => {
    const { execution, invalidate } = run({
      mutationFn: async () => 'ok',
      meta: {
        successKey: 'me.toast.goalAdded',
        invalidates: [
          ['me', 'goals'],
          ['me', 'overview']
        ]
      }
    });

    await execution;

    expect(toast.success).toHaveBeenCalledWith(messages.en.me.toast.goalAdded);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'goals'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'overview'] });
  });

  it('stays silent but still invalidates before a translator is registered', async () => {
    setMutationTranslator({ scope: 'root', translate: null });

    const { execution, invalidate } = run({
      mutationFn: async () => 'ok',
      meta: { successKey: 'me.toast.goalAdded', invalidates: [['me', 'goals']] }
    });

    await execution;

    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'goals'] });
  });

  it('prefers the page translator, which holds the page messages, over the root one', async () => {
    setMutationTranslator({ scope: 'page', translate: (key) => `page:${key}` });

    await run({ mutationFn: async () => 'ok', meta: { successKey: 'me.toast.goalAdded' } }).execution;

    expect(toast.success).toHaveBeenCalledWith('page:me.toast.goalAdded');
  });

  it('toasts a static error key', async () => {
    await expect(run({ mutationFn: () => Promise.reject(new Error('boom')), meta: { errorKey: 'me.toast.failed' } }).execution).rejects.toThrow(
      'boom'
    );

    expect(toast.error).toHaveBeenCalledWith(messages.en.me.toast.failed);
  });

  it('resolves an error key from the error', async () => {
    const errorKey = vi.fn((): 'developer.toast.failed' => 'developer.toast.failed');
    const failure = new Error('boom');

    await expect(run({ mutationFn: () => Promise.reject(failure), meta: { errorKey } }).execution).rejects.toBe(failure);

    expect(errorKey).toHaveBeenCalledWith(failure);
    expect(toast.error).toHaveBeenCalledWith(messages.en.developer.toast.failed);
  });

  it('stays silent for a mutation without meta', async () => {
    const { execution, invalidate } = run({ mutationFn: () => Promise.reject(new Error('boom')) });

    await expect(execution).rejects.toThrow('boom');

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
