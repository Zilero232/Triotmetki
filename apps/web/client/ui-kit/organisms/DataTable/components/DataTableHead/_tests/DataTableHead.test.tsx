import type { ReactElement } from 'react';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { TableColumn } from '../../../DataTable.types';

import { DataTable } from '../../../DataTable';

type Row = { name: string; battles: number; note: string };

const ROWS: Row[] = [
  { name: 'Grom', battles: 1200, note: 'a' },
  { name: 'Stalevar', battles: 90, note: 'b' },
  { name: 'Aurora', battles: 5400, note: 'c' }
];

const COLUMNS: TableColumn<Row>[] = [
  { accessorKey: 'name', header: 'Nickname' },
  { accessorKey: 'battles', header: 'Battles' },
  { accessorKey: 'note', header: 'Note', enableSorting: false }
];

const renderTable = async (ui: ReactElement) => {
  const { container } = render(ui);

  await screen.findByRole('columnheader', { name: /Nickname/ });

  return container;
};

const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });

const firstColumn = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('DataTableHead', () => {
  it('announces sortable columns as unsorted until one is chosen', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    expect(header('Nickname')).toHaveAttribute('aria-sort', 'none');
    expect(header('Battles')).toHaveAttribute('aria-sort', 'none');
  });

  it('offers no sort control on a column that cannot be sorted', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    expect(header('Note')).not.toHaveAttribute('aria-sort');
    expect(within(header('Note')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('cycles a text column through ascending, descending and back to unsorted', async () => {
    const user = userEvent.setup();

    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);
    const toggle = within(header('Nickname')).getByRole('button');
    const alphabetical = ROWS.map((row) => row.name).sort();

    await user.click(toggle);
    expect(header('Nickname')).toHaveAttribute('aria-sort', 'ascending');
    expect(firstColumn()).toEqual(alphabetical);

    await user.click(toggle);
    expect(header('Nickname')).toHaveAttribute('aria-sort', 'descending');
    expect(firstColumn()).toEqual([...alphabetical].reverse());

    await user.click(toggle);
    expect(header('Nickname')).toHaveAttribute('aria-sort', 'none');
    expect(firstColumn()).toEqual(ROWS.map((row) => row.name));
  });

  it('starts a numeric column with the largest value first', async () => {
    const user = userEvent.setup();

    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    await user.click(within(header('Battles')).getByRole('button'));

    const byBattles = [...ROWS].sort((a, b) => b.battles - a.battles).map((row) => row.name);

    expect(header('Battles')).toHaveAttribute('aria-sort', 'descending');
    expect(firstColumn()).toEqual(byBattles);
  });

  it('keeps a single sorted column when another header is chosen', async () => {
    const user = userEvent.setup();

    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    await user.click(within(header('Nickname')).getByRole('button'));
    await user.click(within(header('Battles')).getByRole('button'));

    expect(header('Nickname')).toHaveAttribute('aria-sort', 'none');
    expect(header('Battles')).not.toHaveAttribute('aria-sort', 'none');
  });
});
