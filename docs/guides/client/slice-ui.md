# Slice `ui/` and `ui-kit`

Part of the [style guide](../README.md).

## 2. Slice `ui/` structure

**One component per folder.** A slice's `ui/` takes one of two shapes, and never mixes
them:

- **One exported component** — the canonical layout, used by most slices: the main
  component lies flat in `ui/` and its subcomponents sit in `ui/components/`, one folder
  each.
- **Several exported components** — every one of them gets its own PascalCase folder, and
  none lies flat. Subcomponents that several of them share may sit in a `ui/components/`
  beside the folders (`views/my-analytics/ui/`).

A flat main component beside sibling component folders is the one thing that is not
allowed, and so are two components in one file.

```text
features/app/switch-theme/ui/
  ThemeToggle.tsx                    ← the flat main component
  [ThemeToggle.types.ts]             ← Props and local union types, when it has any
  [ThemeToggle.module.scss]          ← styles, when it has any
  [ThemeToggle.motion.ts]            ← motion presets, when it is animated

views/clan-workspace/ui/
  ClanWorkspacePage.tsx              ← the flat main component
  ClanWorkspacePage.module.scss
  components/                        ← its subcomponents, one folder each
    index.ts
    WorkspaceTabs/
    WorkspaceNotice/

features/search/command-palette/ui/
  CommandPalette/                    ← several top-level components → every one gets a folder
    CommandPalette.tsx
    CommandPalette.module.scss
    index.ts
  CommandPaletteProvider/
  CommandPaletteTrigger/
    CommandPaletteTrigger.tsx
    CommandPaletteTrigger.types.ts
    CommandPaletteTrigger.module.scss
    index.ts
  components/                        ← subcomponents the palette parts share
```

**A component folder holds only these files:**

| File | When |
| --- | --- |
| `<Name>.tsx` | always — the component, JSX only |
| `<Name>.types.ts` | there are Props or local union types |
| `<Name>.module.scss` | the component has styles |
| `index.ts` | always — `export { Name } from './Name';` |
| `components/` | nested subcomponents (barrel + one folder each) |
| `<Name>.motion.ts` / `<Name>.variants.ts` | motion presets / a `cva` variant map, when needed |
| `_tests/` | a component with real behaviour |

**Never** `<Name>.helpers.ts`, `<Name>.utils.ts`, `<Name>.constants.ts`, `<Name>.columns.tsx`
or a `hooks/` folder inside a component folder. Where they go instead:

| Found in a component | Moves to |
| --- | --- |
| `useQuery`/`useMutation`, `useEffect`, `useMemo`/`useCallback`/`useReducer`, 2+ `useState`, timers, storage, clipboard, handlers with more than one statement or `async` | `model/hooks/use-<x>/use-<x>.ts` + `use-<x>.types.ts` + `index.ts` |
| a form (`useForm`, fields, submit) | `model/hooks/use-<x>-form/` ([§15](forms.md)) |
| a helper function (module-level or inside the component) | `lib/<concern>/<concern>.ts` + `index.ts` + `_tests/` |
| a module-level `const`, icon maps, `DEFAULT_VALUES`, skeleton row counts | `config/<concern>.constants.ts`, re-exported from `config/index.ts` |
| a second component | `components/<Name>/` |

What a component body may contain: `useTranslations`/`useFormatter`, navigation and context
hooks, **one** call to its own model hook, **at most one** trivial UI flag (`useBoolean` or a
single `useState` for open/tab), pure single-expression lookups, and JSX.

A **pure single-expression lookup** reads one value from props or config in one step —
`const Icon = ICONS[kind]`, `const { width, height } = TANK_IMAGE[size]`, or one helper
call destructured (`const { ratio, radius } = ringGeometry({ ... })`). A hook per lookup
would be ceremony. Anything built in several steps — values that feed each other,
formatting, filtering, geometry — belongs in the model hook (`ui-kit`: a `shared/lib`
helper or hook).

Table column definitions are the one hook that may be `.tsx`:
`model/hooks/use-<table>-columns/use-<table>-columns.tsx`. It only references cell
components, which live in `ui/components/<Table>/components/<X>Cell/`; no JSX-heavy cells or
`.module.scss` in `model/`. The TanStack helper stays at module level in that file
(`const column = createColumnHelper<Row>()`) — it is stateless and stable, and it is the one
module-level value a hook file may declare.

**Nesting stops at two `components/` levels.** A subcomponent that would need a third
level is lifted to a sibling of its parent (`WorkspaceCandidates/components/NotesDialog`
next to `CandidateActions`), or into a slice of its own when others need it.

**Subcomponents** (used only inside the parent) — each one in a `components/` folder:

```text
features/search/command-palette/ui/
  CommandPalette/
    CommandPalette.tsx
  components/
    index.ts                   ← barrel: re-exports every subcomponent
    PaletteInput/
      PaletteInput.tsx
      PaletteInput.types.ts
      PaletteInput.module.scss
      index.ts                 ← `export { PaletteInput } from './PaletteInput';`
    PaletteResults/
      ...
```

The parent imports through the barrel:

```ts
// ✓ OK
import { PaletteFooter, PaletteInput, PaletteNavigation, PaletteResults, PaletteStatus } from '../components';

// ✗ NOT OK
import { PaletteInput } from '../components/PaletteInput';
```

**File rules:**

- `.types.ts` — created only when there are Props or local union types.
- `.module.scss` — component styles (imported as `import s from './Foo.module.scss'`). Required everywhere: in `ui-kit` as much as in widgets/features/views. There is no CSS-in-JS in this project.
- `.motion.ts` — animation presets for `motion`, next to the component (`Reveal.motion.ts`, `SiteNav.motion.ts`). Don't duplicate an animation with a CSS transition.
- `ui-kit/` — the atomic layer (atoms/molecules/organisms). **No flat `button.tsx`** — every primitive lives in a PascalCase folder ([§2.1](slice-ui.md)). From outside — `@/ui-kit`.

### 2.1. `ui-kit` structure

Every primitive gets its own folder.

```text
ui-kit/
  index.ts                    ← re-export atoms + molecules + organisms
  atoms/
    index.ts                  ← re-export every atom
    Button/
      Button.tsx
      Button.module.scss
      Button.types.ts         ← optional
      Button.variants.ts      ← optional: the cva variant/size map
      _tests/                 ← optional: Vitest next to the component
      index.ts                ← export { Button, buttonVariants } from './Button…';
    RatingBadge/
      ...
  molecules/
    Select/
      Select.tsx
      Select.module.scss
      Select.types.ts
      index.ts
    Dialog/
      Dialog.tsx
      Dialog.module.scss
      index.ts
  organisms/
    DataTable/
      DataTable.tsx
      DataTable.constants.ts
      DataTable.types.ts
      components/             ← DataTableHead, DataTableRows, DataTableVirtualRows, DataTableSkeleton, …
      _tests/
      index.ts
    ChartKit/                 ← shared visx building blocks for AreaChart, BarChart, LineChart
      ...
```

**Rules:**

- Component folder and file names are **PascalCase** (`Button/`, `Button.tsx`).
- `ui-kit` has no slice segments. A primitive's pure helpers go to `shared/lib/<concern>/`,
  its hooks to `shared/lib/use-<x>/` — never `<Name>.helpers.ts` or a `hooks/` folder in the
  component. The one exception to [§2](slice-ui.md)'s file list: a primitive's own tuning constants may sit
  in `<Name>.constants.ts` (`DataTable.constants.ts`), since there is no `config/` to hold them.
- Styles are **`*.module.scss`**; shared utilities are imported as `@use '@/shared/styles/mixins' as *` (the `@/` alias comes from `sassOptions.loadPaths` + `turbopack.resolveAlias` in `next.config.ts`, so no `../../../`).
- Headless + a11y — **`@base-ui/react`**; imported from the package subpath: `@base-ui/react/dialog`, `@base-ui/react/select`, `@base-ui/react/popover`, `@base-ui/react/tabs`. Rename the base primitive at the import (`Select as BaseSelect`) so our own export can carry the plain name.
- Variant maps use **`class-variance-authority`** over the module classes, in `<Name>.variants.ts` (`Button.variants.ts` → `buttonVariants`). The map is exported, so a `Link` can wear a button's look: `className={buttonVariants({ variant: 'secondary' })}`.
- Charts are **visx** (`@visx/scale`, `@visx/shape`, `@visx/axis`, …), assembled from `ChartKit` (`ChartFrame`, `ChartCanvas`, `ChartAxes`, `ChartTooltip`) and `useChartHover` from `shared/lib`. The command palette is **`cmdk`**; tables are **`@tanstack/react-table`** with **`@tanstack/react-virtual`** past `DATA_TABLE.virtualizeAfter` rows.
- React types are **named imports** (`ComponentProps`, `ReactNode`, …), not `import type * as React`.
- Inside `ui-kit`, imports between layers are relative (`../../atoms`). From outside — only `@/ui-kit`.
- The barrels at all levels (`atoms/index.ts`, `molecules/index.ts`, `organisms/index.ts` and the root `ui-kit/index.ts`) use **explicit named** re-exports, with values and types in separate blocks.

### Slice barrel

```ts
// features/search/command-palette/index.ts
export { CommandPalette } from './ui/CommandPalette';
export { CommandPaletteProvider } from './ui/CommandPaletteProvider';
export { CommandPaletteTrigger } from './ui/CommandPaletteTrigger';
```

### Effect hooks instead of a pile of `useEffect` in the component

A side effect with no markup is **its own hook in `model/hooks/`** — it returns nothing
(or a single value) and encapsulates a single effect: the palette hotkey, the
rating-patterns sync, the header's compact state. The orchestrator is a value-building
hook (`use-<x>-state`) or the component that calls them:

```ts
// features/search/command-palette/model/hooks/use-command-palette-state/use-command-palette-state.ts
export const useCommandPaletteState = (): CommandPaletteContextValue => {
  const [isOpen, toggleOpen] = useBoolean(false);

  useCommandPaletteHotkey(() => toggleOpen());

  return { isOpen, setOpen: toggleOpen };
};
```

```tsx
// features/search/command-palette/ui/CommandPaletteProvider/CommandPaletteProvider.tsx
export const CommandPaletteProvider = ({ children }: CommandPaletteProviderProps) => {
  const value = useCommandPaletteState();

  return <CommandPaletteContext value={value}>{children}</CommandPaletteContext>;
};
```

The context object and its `useCommandPalette` consumer live in
`model/context/command-palette/`; the Provider is a component, so it lives in `ui/` and
imports both `model/context` and `model/hooks` — the hooks import the context, never the
Provider, so there is no `hooks ↔ context` cycle.

This keeps effects from bloating the body of the main component; each one is isolated
and can be reasoned about on its own. The alternative — a pile of `useEffect` inside
`CommandPalette.tsx` — is forbidden (it blows past the 100-line limit, [section 4](component-size.md)).

`useCommandPaletteHotkey` (`features/search/command-palette`) and `useRatingPatternsSync`
(`features/app/rating-patterns`) each live in their slice's `model/hooks/`.

### Examples

**`CommandPaletteTrigger.types.ts`:**

```ts
export type CommandPaletteTriggerProps = {
  variant?: 'bar' | 'hero' | 'icon';
  className?: string;
  onOpen?: () => void;
};
```

**`CommandPaletteTrigger.module.scss`** — the component's styles; classes are read off `s`:

```scss
@use '@/shared/styles/mixins' as *;

.root {
  @include reset-button;

  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-strong);
  gap: var(--space-3);
}
```

**`PeriodSwitcher.tsx`:**

```tsx
'use client';

import type { RecentPeriod } from '@otmetki/schemas';

import { recentPeriodSchema } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';

import { SegmentedControl } from '@/ui-kit';

import type { PeriodSwitcherProps } from './PeriodSwitcher.types';

export const PeriodSwitcher = ({ value, size = 'md', className, onChange }: PeriodSwitcherProps) => {
  const t = useTranslations('periods');

  return (
    <SegmentedControl<RecentPeriod>
      aria-label={t('label')}
      className={className}
      options={recentPeriodSchema.options.map((period) => ({ value: period, label: t(period) }))}
      size={size}
      value={value}
      onChange={onChange}
    />
  );
};
```
