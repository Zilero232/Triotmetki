import type { RowData } from '@tanstack/react-table';

declare module 'next-intl' {
  interface AppConfig {
    Formats: typeof import('@/shared/i18n').FORMATS;
    Locale: import('@/shared/i18n').Locale;
    Messages: import('@/shared/i18n').Messages;
  }
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: import('@/shared/api/query-client').MutationFeedbackMeta;
  }
}

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: number | string | undefined;
  }
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'center' | 'end' | 'start';
    bar?: ColumnBarMeta;
    hideBelow?: 'lg' | 'md' | 'sm' | 'xl';
    isMedia?: boolean;
    isNumeric?: boolean;
    isRank?: boolean;
    isSticky?: boolean;
    showBelow?: 'lg' | 'md' | 'sm' | 'xl';
    width?: number | string;
  }

  interface TableMeta<TData extends RowData> {
    pinnedRowIds?: readonly string[];
  }

  type ColumnBarMeta = {
    max?: number;
    tone?: import('@/ui-kit/atoms/ProgressBar/ProgressBar.types').ProgressTone;
  };
}
