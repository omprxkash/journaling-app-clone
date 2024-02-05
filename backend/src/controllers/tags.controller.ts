import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

export async function listTags(req: AuthRequest, res: Response): Promise<void> {
  const tags = await prisma.tag.findMany({
    where: { userId: req.userId! },
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  });
  res.json({ tags });
}

export async function createTag(req: AuthRequest, res: Response): Promise<void> {
  const { name, color } = tagSchema.parse(req.body);
  const userId = req.userId!;

  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) {
    res.status(409).json({ error: 'Tag already exists' });
    return;
  }

  const tag = await prisma.tag.create({
    data: { name, color, userId },
    select: { id: true, name: true, color: true },
  });
  res.status(201).json({ tag });
}
