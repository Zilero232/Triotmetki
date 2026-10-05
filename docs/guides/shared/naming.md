# Naming

Part of the [style guide](../README.md).

## 5. Naming

| What                     | How                  | Example                                      |
| ------------------------ | -------------------- | -------------------------------------------- |
| Slices                   | kebab-case           | `command-palette`, `switch-locale`           |
| Segments                 | kebab-case           | `ui`, `model`, `lib`, `api`, `config`        |
| Component folder         | PascalCase           | `PaletteInput/`, `RatingBadge/`              |
| Component file           | PascalCase + `.tsx`  | `PaletteInput.tsx`                           |
| Types file               | `<Name>.types.ts`    | `PaletteInput.types.ts`                      |
| Styles file              | `<Name>.module.scss` | `Button.module.scss`                         |
| Hook folder + file       | kebab-case           | `use-search-results/use-search-results.ts`   |
| Helper folder + file     | kebab-case           | `lib/group-results/group-results.ts`         |
| Constants file           | kebab-case           | `config/search.constants.ts`                 |
| React component (export) | PascalCase           | `CommandPalette`                             |
| Hook                     | `use` + camelCase    | `useSearchResults`, `useCommandPaletteHotkey` |
| Utility                  | camelCase            | `groupSearchResults`, `ratingTone`           |
| Props type               | `<Name>Props`        | `PlayerCardProps`                            |
| DTO type                 | `<Name>Input/Output` | `SearchInput`, `LocalePathInput`             |

Server app (`apps/web/server`) and packages — kebab-case for every file and folder:

| What                     | How                               | Example                                               |
| ------------------------ | --------------------------------- | ----------------------------------------------------- |
| Module / segment folder  | kebab-case                        | `best-battles/`, `mappers/`, `queries/`              |
| Service / processor file | `<domain>.service.ts`, `.processor.ts` | `player-summary-reader.service.ts`, `billing.processor.ts` |
| Mapper                   | `mappers/<name>/<name>.ts`, `to<Thing>` | `mappers/leaderboard-entry` → `toLeaderboardEntry` |
| Select / query           | `SCREAMING_CASE` / `<name>Sql`     | `PROFILE_CARD_INCLUDE`, `playersSql`                 |
| Config file              | `config/<concern>.constants.ts`   | `config/queue.constants.ts`                           |
| Provider                 | `providers/<name>.provider.ts`    | `armorStorageProvider`                                |
| Injectable class         | PascalCase + role suffix          | `HttpClientService`, `ApiKeyGuard`                    |

> Canonical FSD: kebab-case for every file. Three Marks deviates: PascalCase for component folders and files, kebab-case for hooks and utilities.
