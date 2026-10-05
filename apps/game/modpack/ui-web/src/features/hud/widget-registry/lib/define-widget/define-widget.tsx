import type { DefineHudWidgetInput, HudWidgetEntry } from './define-widget.types';

export const defineHudWidget = <Data,>({ kind, schema, Component, pointer = false }: DefineHudWidgetInput<Data>): HudWidgetEntry => ({
  kind,
  parse: (data) => {
    const parsed = schema.safeParse(data);

    return parsed.success ? { kind, data: parsed.data, pointer, node: <Component data={parsed.data} /> } : undefined;
  }
});
