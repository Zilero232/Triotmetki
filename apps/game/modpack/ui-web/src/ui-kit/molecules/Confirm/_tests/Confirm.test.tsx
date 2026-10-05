// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { stepBack } from '@/shared/lib/escape-stack';

import { Confirm } from '../Confirm';

const confirmProps = (answers: string[]) => ({
  text: 'Reset?',
  confirmLabel: 'Yes',
  cancelLabel: 'No',
  onConfirm: () => answers.push('yes'),
  onCancel: () => answers.push('no')
});

describe(Confirm, () => {
  it('cancels on Esc', () => {
    const answers: string[] = [];

    render(<Confirm {...confirmProps(answers)} />);

    act(() => {
      stepBack();
    });

    expect(answers).toEqual(['no']);
  });
});
