import { Router } from 'express';
import { register, login, logout } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', validate(authSchema), register);
router.post('/login', validate(authSchema), login);
router.post('/logout', logout);

export default router;
