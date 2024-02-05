import { Router } from 'express';
import { listTags, createTag } from '../controllers/tags.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', listTags);
router.post('/', createTag);

export default router;
