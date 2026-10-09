import type { ReactElement } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TableColumn } from '../DataTable.types';

import { DataTable } from '../DataTable';
import { DATA_TABLE } from '../DataTable.constants';

type Row = { name: string; wn8: number };

const ROWS: Row[] = [
  { name: 'Grom', wn8: 2987 },
  { name: 'Stalevar', wn8: 3412 },
  { name: 'Novobranec', wn8: 388 }
];

const COLUMNS: TableColumn<Row>[] = [
  { accessorKey: 'name', header: 'Nickname' },
  { accessorKey: 'wn8', header: 'WN8' }
];

const renderTable = async (ui: ReactElement) => {
  render(ui);

  await screen.findByRole('columnheader', { name: /Nickname/ });
};

const bodyNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('DataTable', () => {
  it('renders a row per item under a header row', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    expect(screen.getAllByRole('row')).toHaveLength(ROWS.length + 1);
  });

  it('honours the initial sorting', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} initialSorting={[{ id: 'wn8', desc: true }]} />);

    const expected = [...ROWS].sort((a, b) => b.wn8 - a.wn8).map((row) => row.name);

    expect(bodyNames()).toEqual(expected);
    expect(screen.getByRole('columnheader', { name: /WN8/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts when a header is clicked', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={ROWS} />);

    fireEvent.click(screen.getByRole('button', { name: /Nickname/ }));

    expect(bodyNames()).toEqual(ROWS.map((row) => row.name).sort());
  });

  it('shows the empty state when there is no data', async () => {
    await renderTable(<DataTable columns={COLUMNS} data={[]} emptyState={<p>Нет данных</p>} />);

    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('renders every row of a list up to the virtualisation threshold', async () => {
    const rows = Array.from({ length: DATA_TABLE.virtualizeAfter }, (_, index) => ({ name: `Player ${index}`, wn8: index }));

    await renderTable(<DataTable columns={COLUMNS} data={rows} />);

    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('virtualises long lists instead of rendering every row', async () => {
    const many = Array.from({ length: 500 }, (_, index) => ({ name: `Player ${index}`, wn8: index }));

    await renderTable(<DataTable columns={COLUMNS} data={many} virtualizeAfter={50} />);

    expect(screen.getAllByRole('row').length).toBeLessThan(many.length);
  });
});
