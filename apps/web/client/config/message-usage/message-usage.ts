import fs from 'node:fs';
import path from 'node:path';

import type {
  CoverageInput,
  FirstGroupsInput,
  KeyLiteralsInput,
  MessageUsageInput,
  ModuleScan,
  PendingModule,
  ResolveImportInput,
  RuntimeDependenciesInput,
  ScanModuleInput
} from './message-usage.types';

import { MESSAGE_USAGE } from './message-usage.constants';

const namespacesOf = (root: string): Set<string> => {
  const files = fs.readdirSync(path.join(root, MESSAGE_USAGE.localesDir));
  const namespaces = files.filter((file) => file.endsWith('.json')).map((file) => path.basename(file, '.json'));

  return new Set(namespaces);
};

const resolveImport = ({ root, from, specifier }: ResolveImportInput): string | null => {
  const isAlias = specifier.startsWith(MESSAGE_USAGE.aliasPrefix);

  if (!isAlias && !specifier.startsWith('.')) {
    return null;
  }

  const base = isAlias ? path.join(root, specifier.slice(MESSAGE_USAGE.aliasPrefix.length)) : path.join(path.dirname(from), specifier);
  const candidates = MESSAGE_USAGE.extensions.map((extension) => `${base}${extension}`);

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
};

const firstGroups = ({ source, pattern }: FirstGroupsInput): string[] => [...source.matchAll(pattern)].map((match) => match[1] ?? '');

const keyLiterals = ({ source, namespaces }: KeyLiteralsInput): string[] => {
  const literals = [...source.matchAll(MESSAGE_USAGE.keyLiteralPattern)];

  return literals.filter((match) => namespaces.has(match[2] ?? '')).map((match) => match[1] ?? '');
};

const runtimeDependencies = ({ root, file, source }: RuntimeDependenciesInput): string[] => {
  const runtimeImports = [...source.matchAll(MESSAGE_USAGE.importPattern)].filter((match) => !MESSAGE_USAGE.typeOnlyPattern.test(match[1] ?? ''));
  const resolved = runtimeImports.map((match) => resolveImport({ root, from: file, specifier: match[2] ?? '' }));

  return resolved.filter((dependency): dependency is string => dependency !== null && !dependency.includes(MESSAGE_USAGE.skippedSegment));
};

const scanModule = ({ root, file, namespaces }: ScanModuleInput): ModuleScan => {
  const source = fs.readFileSync(file, 'utf8');
  const named = [
    ...firstGroups({ source, pattern: MESSAGE_USAGE.hookPattern }),
    ...firstGroups({ source, pattern: MESSAGE_USAGE.namespacePropPattern }),
    ...firstGroups({ source, pattern: MESSAGE_USAGE.errorKeyPattern })
  ];

  const paths = [...named, ...keyLiterals({ source, namespaces })].filter((key) => namespaces.has(key.split('.')[0] ?? ''));

  return { dependencies: runtimeDependencies({ root, file, source }), paths, isClient: MESSAGE_USAGE.clientDirective.test(source) };
};

export const isCoveredBy = ({ key, paths }: CoverageInput): boolean => paths.some((other) => key === other || key.startsWith(`${other}.`));

export const collapsePaths = (paths: Iterable<string>): string[] => {
  const unique = [...new Set(paths)].sort();

  return unique.filter((key) => !isCoveredBy({ key, paths: unique.filter((other) => other !== key) }));
};

export const createMessageUsage = (root: string) => {
  const namespaces = namespacesOf(root);
  const scans = new Map<string, ModuleScan>();

  const scanned = (file: string): ModuleScan => {
    const scan = scans.get(file) ?? scanModule({ root, file, namespaces });

    scans.set(file, scan);

    return scan;
  };

  return ({ entries }: MessageUsageInput): string[] => {
    const visited = new Set<string>();
    const paths = new Set<string>();
    const pending: PendingModule[] = entries.map((entry) => ({ file: path.join(root, entry), isClient: false }));

    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      const scan = scanned(next.file);
      const isClient = next.isClient || scan.isClient;
      const visit = `${isClient}:${next.file}`;

      if (!visited.has(visit)) {
        visited.add(visit);

        if (isClient) {
          scan.paths.forEach((key) => paths.add(key));
        }

        pending.push(...scan.dependencies.map((dependency) => ({ file: dependency, isClient })));
      }
    }

    return collapsePaths(paths);
  };
};

export const declaredMessages = (source: string): string[] | null => {
  const list = MESSAGE_USAGE.declarationPattern.exec(source)?.[1];

  return list === undefined ? null : firstGroups({ source: list, pattern: MESSAGE_USAGE.quotedPattern });
};
