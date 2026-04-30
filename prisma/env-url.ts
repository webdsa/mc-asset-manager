/**
 * URL usada pelo Prisma CLI (`migrate`, `db push`, `studio`, etc.).
 * No Neon, migrations precisam de conexão TCP direta (host sem `-pooler`).
 * Em Docker local, `DATABASE_URL` sozinho basta.
 */
export function migrationDatabaseUrl(): string {
  const url =
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Defina DATABASE_URL no .env. Com Neon, defina também DIRECT_URL (ou DATABASE_URL_UNPOOLED na integração Vercel + Neon) para comandos prisma.",
    );
  }
  return url;
}
