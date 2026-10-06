import * as z from 'zod/mini';

import { LANGUAGES } from '@/shared/i18n';

import { PROTOCOL } from './protocol.constants';

const text = z.string();

export const lenientArray = <Item extends z.ZodMiniType>(item: Item) =>
  z.pipe(
    z.array(z.unknown()),
    z.transform((values) =>
      values.flatMap((value): z.output<Item>[] => {
        const parsed = item.safeParse(value);

        return parsed.success ? [parsed.data] : [];
      })
    )
  );
const optionalText = z.optional(z.nullable(z.string()));

const fieldBase = { key: text, label: text, hint: z.nullable(z.string()), advanced: z.optional(z.boolean()) };

export const fieldSchema = z.discriminatedUnion('type', [
  z.object({ ...fieldBase, type: z.literal('bool'), value: z.boolean(), default: z.boolean() }),
  z.object({
    ...fieldBase,
    type: z.literal('int'),
    value: z.number(),
    default: z.number(),
    min: z.nullable(z.number()),
    max: z.nullable(z.number())
  }),
  z.object({
    ...fieldBase,
    type: z.literal('choice'),
    value: text,
    default: text,
    choices: z.array(z.object({ value: text, label: text }))
  }),
  z.object({ ...fieldBase, type: z.literal('text'), value: text, default: text, max_length: z.number() })
]);

export const actionSchema = z.object({
  id: text,
  label: text,
  confirm: optionalText,
  link: optionalText,
  input: optionalText
});

const detailSchema = z.object({ label: text, value: text });

export const figureSchema = z.object({
  shapes: z.array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
  marks: z.array(z.object({ x: z.number(), y: z.number(), tone: z.enum(PROTOCOL.figureTones) }))
});

const reportBattleSchema = z.object({
  t: z.nullable(z.number()),
  damage: z.nullable(z.number()),
  percent: z.nullable(z.number()),
  delta: z.nullable(z.number()),
  result: z.optional(z.nullable(z.string()))
});

export const marksReportSchema = z.object({
  name: text,
  tier: z.nullable(z.number()),
  tier_icon: z.nullable(z.string()),
  flag: z.nullable(z.string()),
  cls: z.nullable(z.string()),
  percent: z.nullable(z.number()),
  marks: z.number(),
  mark: z.nullable(z.string()),
  avg: z.nullable(z.number()),
  last: z.nullable(reportBattleSchema),
  best: z.nullable(reportBattleSchema),
  record: z.nullable(z.number()),
  trends: z.array(z.object({ window: z.number(), battles: z.number(), delta: z.nullable(z.number()) })),
  battles: z.array(reportBattleSchema),
  chart: z.array(z.number())
});

export const rowSchema = z.object({
  id: text,
  title: text,
  subtitle: optionalText,
  meta: optionalText,
  badge: optionalText,
  link: optionalText,
  details: z.optional(z.array(detailSchema)),
  figure: z.optional(z.nullable(figureSchema)),
  report: z.optional(z.nullable(marksReportSchema)),
  image: optionalText,
  actions: z.array(actionSchema)
});

export const pageSchema = z.object({
  kind: z.literal('list'),
  layout: z.optional(z.enum(PROTOCOL.pageLayouts)),
  title: optionalText,
  note: optionalText,
  empty: text,
  rows: z.array(rowSchema)
});

const replaysPageSchema = z.looseObject({ kind: z.literal('replays') });

export const widgetSchema = z.object({ kind: z.string(), v: z.number(), data: z.unknown() });

export const editorSchema = z.object({
  groups: z.array(z.object({ id: text, label: text, keys: z.array(text) })),
  icons: z.record(text, z.record(text, z.nullable(z.string()))),
  swatches: z.record(text, z.record(text, text)),
  samples: z.optional(z.array(z.object({ id: text, label: text, widget: widgetSchema }))),
  schematic: z.optional(z.enum(PROTOCOL.schematics))
});

export const componentSchema = z.object({
  id: text,
  group: text,
  section: z.enum(PROTOCOL.sections),
  context: z.enum(PROTOCOL.contexts),
  title: text,
  hint: z.nullable(z.string()),
  switch: z.nullable(z.object({ key: text, value: z.boolean() })),
  fields: z.array(fieldSchema),
  panel: z.boolean(),
  actions: z.array(actionSchema),
  page: z.nullable(z.discriminatedUnion('kind', [pageSchema, replaysPageSchema])),
  editor: z.optional(editorSchema),
  thumb: optionalText,
  owner: z.optional(text),
  gallery: z.optional(z.record(text, z.record(text, z.nullable(z.string()))))
});

export const panelSchema = z.object({
  id: text,
  title: text,
  enabled: z.boolean(),
  x: z.number(),
  y: z.number(),
  align_x: z.enum(PROTOCOL.alignX),
  align_y: z.enum(PROTOCOL.alignY),
  preview: z.nullable(z.string()),
  text: z.optional(z.nullable(z.string())),
  widget: z.optional(z.nullable(widgetSchema)),
  width: z.number(),
  height: z.number()
});

export const noticeSchema = z.object({
  kind: z.enum(PROTOCOL.noticeKinds),
  text: z.nullable(z.string()),
  code: z.nullable(z.string())
});

export const statusSchema = z.object({
  bound: z.boolean(),
  auth_failed: z.boolean(),
  account_id: z.nullable(z.number()),
  text,
  server: z.optional(z.nullable(text))
});

export const windowSchema = z.object({
  placed: z.boolean(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zoom: z.number()
});

export const profileSchema = z.object({ id: text, name: text, updated: z.nullable(z.number()) });

export const profilesSchema = z.object({ active: z.nullable(z.string()), items: z.array(profileSchema) });

export const stateSchema = z.object({
  v: z.literal(PROTOCOL.version),
  revision: z.number(),
  language: z.enum(LANGUAGES),
  language_setting: text,
  languages: z.array(text),
  status: statusSchema,
  site: text,
  components: lenientArray(componentSchema),
  profiles: profilesSchema,
  hud: z.object({ editing: z.boolean(), panels: z.array(panelSchema) }),
  notice: z.nullable(noticeSchema),
  window: windowSchema,
  scroll: z.partialRecord(z.enum(PROTOCOL.pages), z.number())
});

const feedItemSchema = z.looseObject({ id: text });

export const feedSchema = z.object({
  v: z.literal(PROTOCOL.version),
  feed: text,
  rev: z.number(),
  base: z.nullable(z.number()),
  page: z.nullable(z.looseObject({})),
  items: z.optional(z.array(feedItemSchema)),
  set: z.optional(z.array(feedItemSchema)),
  del: z.optional(z.array(text))
});

const settingValue = z.union([z.boolean(), z.number(), z.string()]);

export const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('set'), component: text, key: text, value: settingValue }),
  z.object({ type: z.literal('set_many'), component: text, values: z.record(text, settingValue) }),
  z.object({ type: z.literal('action'), component: text, action: text, row: z.optional(text), value: z.optional(text) }),
  z.object({ type: z.literal('language'), language: z.enum([PROTOCOL.autoLanguage, ...LANGUAGES] as const) }),
  z.object({ type: z.literal('bind'), code: text }),
  z.object({ type: z.literal('open'), path: text }),
  z.object({ type: z.literal('profile_save'), name: text, id: z.optional(text) }),
  z.object({ type: z.literal('profile_load'), id: text }),
  z.object({ type: z.literal('profile_rename'), id: text, name: text }),
  z.object({ type: z.literal('profile_delete'), id: text }),
  z.object({ type: z.literal('profile_export'), id: text }),
  z.object({ type: z.literal('profile_import'), code: text, name: z.optional(text) }),
  z.object({ type: z.literal('hud_edit'), active: z.boolean() }),
  z.object({
    type: z.literal('hud_move'),
    panel: text,
    x: z.number(),
    y: z.number(),
    align_x: z.optional(z.enum(PROTOCOL.alignX)),
    align_y: z.optional(z.enum(PROTOCOL.alignY))
  }),
  z.object({ type: z.literal('hud_reset'), panel: text }),
  z.object({ type: z.literal('hud_reset_all') }),
  z.object({
    type: z.literal('window_layout'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    zoom: z.number(),
    placed: z.optional(z.boolean())
  }),
  z.object({ type: z.literal('feed'), component: text, active: z.boolean() }),
  z.object({ type: z.literal('diag'), text }),
  z.object({ type: z.literal('escape') }),
  z.object({ type: z.literal('scroll'), page: z.enum(PROTOCOL.pages), top: z.number() })
]);
