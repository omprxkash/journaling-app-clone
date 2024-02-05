import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function setAuthCookie(res: Response, userId: string): void {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = authSchema.parse(req.body);


  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hash },
    select: { id: true, email: true, createdAt: true },
  });

  setAuthCookie(res, user.id);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = authSchema.parse(req.body);


  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  setAuthCookie(res, user.id);
  res.json({ user: { id: user.id, email: user.email, createdAt: user.createdAt } });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token');
  res.json({ ok: true });
}
