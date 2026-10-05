import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFormField } from '../use-form-field';

describe('useFormField', () => {
  it('points the control at the error first, keeps the hint, and marks it invalid', () => {
    const { result } = renderHook(() => useFormField({ hasHint: true, hasError: true }));

    expect(result.current.control).toEqual({
      id: result.current.controlId,
      'aria-describedby': `${result.current.errorId} ${result.current.hintId}`,
      'aria-invalid': true
    });
  });

  it('points the control at the error alone when there is no hint', () => {
    const { result } = renderHook(() => useFormField({ hasHint: false, hasError: true }));

    expect(result.current.control['aria-describedby']).toBe(result.current.errorId);
  });

  it('describes the control by its hint and keeps a given id', () => {
    const { result } = renderHook(() => useFormField({ htmlFor: 'name', hasHint: true, hasError: false }));

    expect(result.current.controlId).toBe('name');
    expect(result.current.control).toEqual({ 'aria-describedby': result.current.hintId });
  });
});
