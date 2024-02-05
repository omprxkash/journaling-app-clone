import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*{1,3}(.+?)\*{1,3}/g, '$1')
    .replace(/_{1,3}(.+?)_{1,3}/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/>\s/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function updateSearchVector(entryId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Entry"
    SET "searchVec" = to_tsvector('english', "title" || ' ' || "bodyPlain")
    WHERE id = ${entryId}
  `;
}

export async function searchEntries(
  userId: string,
  query: string,
  limit = 20,
  offset = 0
): Promise<string[]> {
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Entry"
    WHERE "userId" = ${userId}
      AND "deletedAt" IS NULL
      AND "searchVec" @@ plainto_tsquery('english', ${query})
    ORDER BY ts_rank("searchVec", plainto_tsquery('english', ${query})) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return results.map((r: { id: string }) => r.id);
}
