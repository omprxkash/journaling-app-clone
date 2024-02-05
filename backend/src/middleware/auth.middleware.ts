import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
    res.status(401).json({ error: isExpired ? 'Session expired, please sign in again' : 'Invalid token' });
  }
}
