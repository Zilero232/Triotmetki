import type { CardColumnsProps } from './CardColumns.types';

import s from './CardColumns.module.scss';

export const CardColumns = ({ columns, card: Card }: CardColumnsProps) => (
  <div className={s.columns}>
    {columns.map((column) => (
      <div key={column.id} className={s.column}>
        {column.items.map(({ component, fields }) => (
          <Card key={component.id} component={component} fields={fields} />
        ))}
      </div>
    ))}
  </div>
);
