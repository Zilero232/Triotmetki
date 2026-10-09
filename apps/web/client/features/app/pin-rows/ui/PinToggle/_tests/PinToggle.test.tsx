import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TableColumn } from '@/ui-kit';

import { PinToggle, usePinnedRows } from '@/features/app/pin-rows';
import { messages } from '@/shared/i18n';
import { isPinnedCell } from '@/shared/lib';
import { DataTable } from '@/ui-kit';

const renders = vi.hoisted(() => new Map<string, number>());

vi.mock('@/features/app/pin-rows/model/hooks/use-pin-toggle/use-pin-toggle', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/app/pin-rows/model/hooks/use-pin-toggle/use-pin-toggle')>();

  return {
    usePinToggle: (input: Parameters<typeof original.usePinToggle>[0]) => {
      renders.set(input.id, (renders.get(input.id) ?? 0) + 1);

      return original.usePinToggle(input);
    }
  };
});

type Row = { id: string; name: string };

const ROWS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie' }
];

const COLUMNS: TableColumn<Row>[] = [
  {
    id: 'pin',
    header: 'Pin',
    cell: ({ row, table }) => <PinToggle id={row.id} isOn={isPinnedCell({ row, table })} name={row.original.name} scope='maps' />
  },
  { accessorKey: 'name', header: 'Name' }
];

const PinnedTable = () => {
  const { rowIds } = usePinnedRows({ scope: 'maps', isPinnedOnly: false });

  return <DataTable columns={COLUMNS} data={ROWS} getRowId={(row) => row.id} pinnedRowIds={rowIds} />;
};

afterEach(() => {
  window.localStorage.clear();
  renders.clear();
});

describe('PinToggle', () => {
  it('pins a row and re-renders only the toggle whose state changed', async () => {
    render(
      <NextIntlClientProvider locale='ru' messages={messages.ru}>
        <PinnedTable />
      </NextIntlClientProvider>
    );

    const [, bravo] = await screen.findAllByRole('button', { pressed: false });
    const before = new Map(renders);

    fireEvent.click(bravo);

    expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(/Bravo/);
    expect(renders.get('b')).toBeGreaterThan(before.get('b') ?? 0);
    expect(renders.get('a')).toBe(before.get('a'));
    expect(renders.get('c')).toBe(before.get('c'));
  });
});
