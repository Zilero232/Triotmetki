// Files that still build SQL through Prisma's raw API ($queryRaw, $executeRaw, Prisma.sql/raw/join/empty).
// New code writes SQL with Kysely (prisma.$kysely / tx.$kysely, docs/guides/server/queries.md); a module
// package that moves a file to Kysely deletes its line here. The list only shrinks, and goes away when empty.
export const RAW_SQL_ALLOWLIST = [];
