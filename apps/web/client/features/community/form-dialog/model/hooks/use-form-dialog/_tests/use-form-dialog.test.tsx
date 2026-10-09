import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import type { UseFormDialogInput } from '../use-form-dialog.types';

import { useFormDialog } from '../use-form-dialog';

vi.hoisted(() => vi.resetModules());

afterAll(() => {
  vi.resetModules();
});

const push = vi.hoisted(() => vi.fn<(href: string) => void>());

vi.mock('@/shared/i18n/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const schema = z.object({ name: z.string().trim().min(1) });

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;
type Saved = { slug: string };

const DEFAULTS: Values = { name: '' };
const LIST_KEY = ['things', 'list'];
const SUCCESS = 'saved';
const FAILURE = 'failed';

const setup = (overrides: Partial<UseFormDialogInput<Values, Output, Saved>> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const mutationFn = vi.fn((values: Output) => Promise.resolve({ slug: values.name }));

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  const hook = renderHook(
    (defaults: Values) =>
      useFormDialog<Values, Output, Saved>({
        schema,
        defaults,
        mutationFn,
        successMessage: SUCCESS,
        errorMessage: () => FAILURE,
        ...overrides
      }),
    { wrapper, initialProps: DEFAULTS }
  );

  return { ...hook, invalidate, mutationFn };
};

const submit = async (result: { current: ReturnType<typeof useFormDialog<Values, Output, Saved>> }) => {
  await act(() => result.current.onSubmit());
};

describe('useFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves the parsed values, then closes and resets the form', async () => {
    const { result, invalidate, mutationFn } = setup({ invalidate: LIST_KEY, redirect: ({ slug }) => `/things/${slug}` });

    act(() => result.current.onOpenChange(true));
    act(() => result.current.form.setValue('name', '  tiger  '));
    await submit(result);

    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(mutationFn.mock.calls[0]?.[0]).toEqual({ name: 'tiger' });
    expect(toast.success).toHaveBeenCalledWith(SUCCESS);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST_KEY });
    expect(push).toHaveBeenCalledWith('/things/tiger');
    expect(result.current.form.getValues()).toEqual(DEFAULTS);
  });

  it('hands the saved result to onSuccess and neither invalidates nor navigates unless asked', async () => {
    const onSuccess = vi.fn();
    const { result, invalidate } = setup({ onSuccess });

    act(() => result.current.onOpenChange(true));
    act(() => result.current.form.setValue('name', 'tiger'));
    await submit(result);

    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(onSuccess.mock.calls[0]?.[0]).toEqual({ slug: 'tiger' });
    expect(invalidate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('does not call the server when the values are invalid', async () => {
    const { result, mutationFn } = setup();

    act(() => result.current.onOpenChange(true));
    await submit(result);

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
  });

  it('keeps the dialog open and reports the failure', async () => {
    const mutationFn = vi.fn(() => Promise.reject(new Error('down')));
    const { result } = setup({ mutationFn });

    act(() => result.current.onOpenChange(true));
    act(() => result.current.form.setValue('name', 'tiger'));
    await submit(result);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FAILURE));
    expect(result.current.isOpen).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it('opens with the latest defaults', () => {
    const { result, rerender } = setup();
    const next: Values = { name: 'panther' };

    rerender(next);
    act(() => result.current.onOpenChange(true));

    expect(result.current.form.getValues()).toEqual(next);
  });
});
