import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'use-intl';
import { describe, expect, it, vi } from 'vitest';

import { MESSAGES } from '@/shared/i18n';
import { Button, ConfirmDialog } from '@/ui-kit';

const renderDialog = (onConfirm: () => void) =>
  render(
    <IntlProvider locale='ru' messages={MESSAGES.ru}>
      <ConfirmDialog
        cancelLabel='Отмена'
        confirmLabel='Удалить'
        title='Удалить модпак из этого клиента?'
        tone='danger'
        trigger={<Button>Удалить модпак</Button>}
        onConfirm={onConfirm}
      />
    </IntlProvider>
  );

describe('ConfirmDialog', () => {
  it('runs the action and closes on confirm', async () => {
    const onConfirm = vi.fn();

    renderDialog(onConfirm);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить модпак' }));
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('closes on cancel without running the action', async () => {
    const onConfirm = vi.fn();

    renderDialog(onConfirm);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить модпак' }));
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
