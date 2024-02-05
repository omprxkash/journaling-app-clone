import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { stripMarkdown, countWords, updateSearchVector, searchEntries } from '../services/search.service';

const prisma = new PrismaClient();

const entrySchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string(),
  tags: z.array(z.string()).default([]),
  mood: z.enum(['happy', 'neutral', 'sad', 'anxious']).optional(),
});

const entrySelect = {
  id: true,
  title: true,
  body: true,
  bodyPlain: true,
  mood: true,
  wordCount: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: { select: { id: true, name: true, color: true } },
};

export async function listEntries(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId!;
  const { tag, search, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;

  const take = Math.min(Math.max(1, parseInt(limit) || 20), 100);
  const skip = (Math.max(1, parseInt(page) || 1) - 1) * take;

  if (search) {
    const ids = await searchEntries(userId, search, take, skip);
    const entries = await prisma.entry.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: entrySelect,
    });
    res.json({ entries, page: parseInt(page), limit: take });
    return;
  }

  const where: Record<string, unknown> = {
    userId,
    deletedAt: null,
    ...(tag && { tags: { some: { name: tag } } }),
    ...(from || to ? {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      select: entrySelect,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.entry.count({ where }),
  ]);

  res.json({ entries, total, page: parseInt(page), limit: take });
}

export async function createEntry(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId!;
  const { title, body, tags, mood } = entrySchema.parse(req.body);
  const bodyPlain = stripMarkdown(body);
  const wordCount = countWords(bodyPlain);

  const entry = await prisma.entry.create({
    data: {
      userId,
      title,
      body,
      bodyPlain,
      wordCount,
      mood,
      tags: {
        connectOrCreate: tags.map((name: string) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
    },
    select: entrySelect,
  });

  await updateSearchVector(entry.id).catch(() => {/* non-fatal */});
  res.status(201).json({ entry });
}

export async function getEntry(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const entry = await prisma.entry.findFirst({
    where: { id, userId: req.userId!, deletedAt: null },
    select: entrySelect,
  });
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ entry });
}

export async function updateEntry(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.userId!;
  const existing = await prisma.entry.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { title, body, tags, mood } = entrySchema.parse(req.body);
  const bodyPlain = stripMarkdown(body);
  const wordCount = countWords(bodyPlain);

  const entry = await prisma.entry.update({
    where: { id },
    data: {
      title,
      body,
      bodyPlain,
      wordCount,
      mood,
      tags: {
        set: [],
        connectOrCreate: tags.map((name: string) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
    },
    select: entrySelect,
  });

  await updateSearchVector(entry.id).catch(() => {/* non-fatal */});
  res.json({ entry });
}

export async function deleteEntry(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.entry.findFirst({
    where: { id, userId: req.userId!, deletedAt: null },
  });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.entry.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
}

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId!;
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const entries = await prisma.entry.findMany({
    where: { userId, deletedAt: null, createdAt: { gte: since } },
    select: { createdAt: true, wordCount: true },
    orderBy: { createdAt: 'asc' },
  });

  const totalEntries = await prisma.entry.count({ where: { userId, deletedAt: null } });
  const totalWordsResult = await prisma.entry.aggregate({
    where: { userId, deletedAt: null },
    _sum: { wordCount: true },
  });

  const dayMap = new Map<string, { count: number; wordCount: number }>();
  for (const e of entries) {
    const day = e.createdAt.toISOString().slice(0, 10);
    const cur = dayMap.get(day) ?? { count: 0, wordCount: 0 };
    dayMap.set(day, { count: cur.count + 1, wordCount: cur.wordCount + e.wordCount });
  }

  const heatmap = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

  const sortedDays = Array.from(dayMap.keys()).sort();
  let streakDays = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;

  while (dayMap.has(cursor)) {
    streakDays++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  res.json({
    totalEntries,
    totalWords: totalWordsResult._sum.wordCount ?? 0,
    streakDays,
    heatmap,
    sortedDays,
  });
}
