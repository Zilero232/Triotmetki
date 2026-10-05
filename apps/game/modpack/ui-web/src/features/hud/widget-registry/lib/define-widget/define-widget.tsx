import { ErrorBoundary } from 'react-error-boundary';

import type { DefineHudWidgetInput, HudWidgetEntry } from './define-widget.types';

export const defineHudWidget = <Data,>({ kind, schema, Component, pointer = false }: DefineHudWidgetInput<Data>): HudWidgetEntry => ({
  kind,
  parse: (data) => {
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      return undefined;
    }

    const node = (
      <ErrorBoundary fallback={null} resetKeys={[parsed.data]}>
        <Component data={parsed.data} />
      </ErrorBoundary>
    );

    return { kind, data: parsed.data, pointer, node };
  }
});
